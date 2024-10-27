import {
	CoreMessage,
	FinishReason,
	GenerateTextResult,
	LanguageModel,
	LanguageModelUsage,
	StreamTextResult,
	generateText as aiGenerateText,
	streamText as aiStreamText,
} from 'ai';
import { countTokens } from '#llm/tokens';
import { FunctionResponse, GenerateFunctionOptions, GenerateJsonOptions, GenerateTextOptions, LLM, LlmMessage } from './llm';
import { extractJsonResult, extractStringResult, parseFunctionCallsXml } from './responseParsers';

import { agentContext } from '#agent/agentContextLocalStorage';
import { addCost } from '#agent/agentContextLocalStorage';
import { LlmCall } from '#llm/llmCallService/llmCall';
import { logger } from '#o11y/logger';
import { withActiveSpan } from '#o11y/trace';
import { appContext } from '../app';

export interface SerializedLLM {
	service: string;
	model: string;
}

export abstract class BaseLLM implements LLM {
	constructor(
		protected readonly displayName: string,
		protected readonly service: string,
		protected readonly model: string,
		private maxInputTokens: number,
		/** Needed for Aider when we only have the text size */
		public readonly calculateInputCost: (input: string) => number,
		/** Needed for Aider when we only have the text size */
		public readonly calculateOutputCost: (output: string) => number,
	) {}

	abstract _generateText(systemPrompt: string | undefined, userPrompt: string, opts?: GenerateTextOptions): Promise<string>;

	generateText(userPrompt: string, opts?: GenerateTextOptions): Promise<string>;
	generateText(systemPrompt: string, userPrompt: string, opts?: GenerateTextOptions): Promise<string>;
	async generateText(userPromptOrSystemPrompt: string, userPromptOrOpts?: string | GenerateTextOptions, opts?: GenerateTextOptions): Promise<string> {
		const { userPrompt, systemPrompt, options } = this.parsePromptParameters<GenerateTextOptions>(userPromptOrSystemPrompt, userPromptOrOpts, opts);
		return this._generateText(systemPrompt, userPrompt, options);
	}

	async generateFunctionResponse(systemPrompt: string, prompt: string, opts?: GenerateFunctionOptions): Promise<FunctionResponse> {
		const response = await this._generateText(systemPrompt, prompt, opts);
		return {
			textResponse: response,
			functions: parseFunctionCallsXml(response),
		};
	}

	async generateTextWithResult(userPrompt: string, opts?: GenerateTextOptions): Promise<string>;
	async generateTextWithResult(systemPrompt: string, userPrompt: string, opts?: GenerateTextOptions): Promise<string>;

	async generateTextWithResult(userPromptOrSystemPrompt: string, userPromptOrOpts?: string | GenerateTextOptions, opts?: GenerateTextOptions): Promise<string> {
		const { userPrompt, systemPrompt, options } = this.parsePromptParameters<GenerateTextOptions>(userPromptOrSystemPrompt, userPromptOrOpts, opts);
		const response = await this._generateText(systemPrompt, userPrompt, options);
		return extractStringResult(response);
	}

	async generateJson<T>(userPrompt: string, opts?: GenerateJsonOptions): Promise<T>;
	async generateJson<T>(systemPrompt: string, userPrompt: string, opts?: GenerateJsonOptions): Promise<T>;
	async generateJson(userPromptOrSystemPrompt: string, userPromptOrOpts?: string | GenerateJsonOptions, opts?: GenerateJsonOptions): Promise<string> {
		const { userPrompt, systemPrompt, options } = this.parsePromptParameters<GenerateJsonOptions>(userPromptOrSystemPrompt, userPromptOrOpts, opts);
		const response = await this.generateText(systemPrompt, userPrompt, options ? { type: 'json', ...options } : { type: 'json' });
		return extractJsonResult(response);
	}

	/** Handles extracting the args from the overloaded generateXXX functions */
	private parsePromptParameters<GenerateOptions>(
		userPromptOrSystemPrompt: string,
		userPromptOrOpts?: string | GenerateOptions,
		opts?: GenerateOptions,
	): { userPrompt: string; systemPrompt?: string; options?: GenerateOptions } {
		let systemPrompt: string | undefined;
		let userPrompt: string;
		let options: GenerateOptions | undefined;

		if (typeof userPromptOrOpts === 'string') {
			// Three arguments: systemPrompt, userPrompt, opts
			systemPrompt = userPromptOrSystemPrompt;
			userPrompt = userPromptOrOpts;
			options = opts;
		} else {
			// Two arguments: userPrompt, opts
			systemPrompt = undefined;
			userPrompt = userPromptOrSystemPrompt;
			options = userPromptOrOpts;
		}

		return { userPrompt, systemPrompt, options };
	}

	getMaxInputTokens(): number {
		return this.maxInputTokens;
	}

	isRetryableError(e: any): boolean {
		return false;
	}

	getModel(): string {
		return this.model;
	}

	getService(): string {
		return this.service;
	}

	getId(): string {
		return `${this.service}:${this.model}`;
	}

	getDisplayName(): string {
		return this.displayName;
	}

	calculateCost(input: string, output: string): [totalCost: number, inputCost: number, outputCost: number] {
		const inputCost = this.calculateInputCost(input);
		const outputCost = this.calculateOutputCost(output);
		const totalCost = inputCost + outputCost;
		return [totalCost, inputCost, outputCost];
	}

	countTokens(text: string): Promise<number> {
		// defaults to gpt4o token parser
		return countTokens(text);
	}

	async generateJsonFromMessages<T>(messages: LlmMessage[], opts?: GenerateJsonOptions): Promise<T> {
		const response = await this.generateTextFromMessages(messages, opts ? { type: 'json', ...opts } : { type: 'json' });
		return extractJsonResult(response);
	}

	async generateTextFromMessages(llmMessages: LlmMessage[], opts?: GenerateTextOptions): Promise<string> {
		return withActiveSpan(`generateTextFromMessages ${opts?.id ?? ''}`, async (span) => {
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
				callStack: agentContext()?.callStack.join(' > '),
			});

			const requestTime = Date.now();

			try {
				const result: GenerateTextResult<any> = await aiGenerateText({
					model: this.aiModel(),
					messages,
					temperature: opts?.temperature,
					topP: opts?.topP,
					stopSequences: opts?.stopSequences,
				});

				const responseText = result.text;
				const finishTime = Date.now();
				const llmCall: LlmCall = await llmCallSave;

				// TODO calculate costs from response tokens
				result.usage.totalTokens;
				result.usage.promptTokens;
				result.usage.completionTokens;
				const inputCost = this.calculateInputCost(prompt);
				const outputCost = this.calculateOutputCost(responseText);
				const cost = inputCost + outputCost;

				llmCall.responseText = responseText;
				llmCall.timeToFirstToken = null; // Not available in this implementation
				llmCall.totalTime = finishTime - requestTime;
				llmCall.cost = cost;
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
				callStack: agentContext()?.callStack.join(' > '),
			});

			const requestTime = Date.now();

			try {
				const result = await aiStreamText({
					model: this.aiModel(),
					messages,
					temperature: opts?.temperature,
					topP: opts?.topP,
					stopSequences: opts?.stopSequences,
				});

				for await (const textPart of result.textStream) {
					onChunk({ string: textPart });
				}

				const response = await result.response;
				// TODO calculate costs from response tokens
				const usage: LanguageModelUsage = await result.usage;
				usage.totalTokens;
				usage.promptTokens;
				usage.completionTokens;
				const inputCost = this.calculateInputCost(prompt);
				const outputCost = this.calculateOutputCost(await result.text);
				const cost = inputCost + outputCost;
				addCost(cost);

				const llmCall = await llmCallSave;

				const finishReason: FinishReason = await result.finishReason;
				if (finishReason !== 'stop') throw new Error(`Unexpected finish reason ${finishReason}`);

				return result;
			} catch (error) {
				span.recordException(error);
				throw error;
			}
		});
	}

	isConfigured(): boolean {
		// Default implementation, should be overridden by specific LLM implementations
		return true;
	}

	/** Model id form the Vercel AI package */
	aiModel(): LanguageModel {
		throw new Error('Unsupported implementation');
	}
}
