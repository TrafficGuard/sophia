import { ProviderV1 } from '@ai-sdk/provider';
import {
	CoreMessage,
	FinishReason,
	GenerateTextResult,
	LanguageModelUsage,
	LanguageModelV1,
	ProviderMetadata,
	StreamTextResult,
	generateText as aiGenerateText,
	streamText as aiStreamText,
} from 'ai';
import { addCost, agentContext } from '#agent/agentContextLocalStorage';
import { BaseLLM } from '#llm/base-llm';
import { GenerateTextOptions, LlmMessage } from '#llm/llm';
import { LlmCall } from '#llm/llmCallService/llmCall';
import { logger } from '#o11y/logger';
import { withActiveSpan } from '#o11y/trace';
import { appContext } from '../../applicationContext';

/**
 * Base class for LLM implementations using the Vercel ai package
 */
export abstract class AiLLM<Provider extends ProviderV1> extends BaseLLM {
	protected aiProvider: Provider | undefined;

	protected abstract provider(): Provider;

	protected abstract apiKey(): string | undefined;

	isConfigured(): boolean {
		return Boolean(this.apiKey());
	}

	aiModel(): LanguageModelV1 {
		return this.provider().languageModel(this.getModel());
	}

	protected supportsGenerateTextFromMessages(): boolean {
		return true;
	}

	protected processMessages(llmMessages: LlmMessage[]): LlmMessage[] {
		return llmMessages;
	}

	async generateTextFromMessages(llmMessages: LlmMessage[], opts?: GenerateTextOptions): Promise<string> {
		return withActiveSpan(`generateTextFromMessages ${opts?.id ?? ''}`, async (span) => {
			const messages: CoreMessage[] = this.processMessages(llmMessages);

			const prompt = messages.map((m) => m.content).join('\n');
			span.setAttributes({
				inputChars: prompt.length,
				model: this.model,
				service: this.service,
			});

			const llmCallSave: Promise<LlmCall> = appContext().llmCallService.saveRequest({
				userPrompt: prompt,
				messages: llmMessages,
				llmId: this.getId(),
				agentId: agentContext()?.agentId,
				callStack: this.callStack(agentContext()),
			});

			const requestTime = Date.now();
			try {
				const result: GenerateTextResult<any, any> = await aiGenerateText({
					model: this.aiModel(),
					messages,
					temperature: opts?.temperature,
					topP: opts?.topP,
					stopSequences: opts?.stopSequences,
				});

				const responseText = result.text;
				const finishTime = Date.now();
				const llmCall: LlmCall = await llmCallSave;

				const inputCost = this.calculateInputCost('', result.usage.promptTokens, result.experimental_providerMetadata);
				const outputCost = this.calculateOutputCost(responseText, result.usage.completionTokens);
				const cost = inputCost + outputCost;

				llmCall.responseText = responseText;
				llmCall.timeToFirstToken = finishTime - requestTime;
				llmCall.totalTime = finishTime - requestTime;
				llmCall.cost = cost;
				llmCall.inputTokens = result.usage.promptTokens;
				llmCall.outputTokens = result.usage.completionTokens;
				addCost(cost);

				span.setAttributes({
					inputChars: prompt.length,
					outputChars: responseText.length,
					response: responseText,
					inputCost,
					outputCost,
					cost,
				});

				try {
					await appContext().llmCallService.saveResponse(llmCall);
				} catch (e) {
					logger.error(e);
				}

				return responseText;
			} catch (error) {
				span.recordException(error);
				throw error;
			}
		});
	}

	async streamText(llmMessages: LlmMessage[], onChunk: ({ string }) => void, opts?: GenerateTextOptions): Promise<StreamTextResult<any>> {
		return withActiveSpan(`streamText ${opts?.id ?? ''}`, async (span) => {
			const messages: CoreMessage[] = llmMessages.map((msg) => {
				if (msg.cache === 'ephemeral') {
					msg.experimental_providerMetadata = { anthropic: { cacheControl: { type: 'ephemeral' } } };
				}
				return msg;
			});

			const prompt = messages.map((m) => m.content).join('\n');
			span.setAttributes({
				inputChars: prompt.length,
				model: this.model,
				service: this.service,
			});

			const llmCallSave: Promise<LlmCall> = appContext().llmCallService.saveRequest({
				userPrompt: prompt,
				messages: llmMessages,
				llmId: this.getId(),
				agentId: agentContext()?.agentId,
				callStack: this.callStack(agentContext()),
			});

			const requestTime = Date.now();
			try {
				const result = aiStreamText({
					model: this.aiModel(),
					messages,
					temperature: opts?.temperature,
					topP: opts?.topP,
					stopSequences: opts?.stopSequences,
				});

				for await (const textPart of result.textStream) {
					onChunk({ string: textPart });
				}

				const usage: LanguageModelUsage = await result.usage;
				const metadata: ProviderMetadata = await result.experimental_providerMetadata;
				const inputCost = this.calculateInputCost('', usage.promptTokens, metadata);
				const outputCost = this.calculateOutputCost(await result.text, usage.completionTokens);
				const cost = inputCost + outputCost;
				addCost(cost);

				await llmCallSave;

				const finishReason: FinishReason = await result.finishReason;
				if (finishReason !== 'stop') throw new Error(`Unexpected finish reason ${finishReason}`);

				return result;
			} catch (error) {
				span.recordException(error);
				throw error;
			}
		});
	}
}
