import Anthropic from '@anthropic-ai/sdk';
import { AnthropicVertex } from '@anthropic-ai/vertex-sdk';
import { addCost, agentContext } from '#agent/agentContextLocalStorage';
import { BaseLLM } from '../base-llm';
import { MaxTokensError } from '../errors';
import { GenerateTextOptions, LLM, LlmMessage, combinePrompts, logTextGeneration } from '../llm';
import Message = Anthropic.Message;
import { LlmCall } from '#llm/llmCallService/llmCall';
import { logger } from '#o11y/logger';
import { withActiveSpan } from '#o11y/trace';
import { currentUser } from '#user/userService/userContext';
import { envVar } from '#utils/env-var';
import { appContext } from '../../app';
import { RetryableError, cacheRetry } from '../../cache/cacheRetry';
import TextBlock = Anthropic.TextBlock;
import { AgentLLMs } from '#agent/agentContextTypes';

export const ANTHROPIC_VERTEX_SERVICE = 'anthropic-vertex';

// https://cloud.google.com/vertex-ai/generative-ai/docs/partner-models/use-claude#anthropic_claude_region_availability

export function anthropicVertexLLMRegistry(): Record<string, () => LLM> {
	return {
		[`${ANTHROPIC_VERTEX_SERVICE}:claude-3-haiku`]: Claude3_Haiku_Vertex,
		[`${ANTHROPIC_VERTEX_SERVICE}:claude-3-sonnet`]: Claude3_Sonnet_Vertex,
		[`${ANTHROPIC_VERTEX_SERVICE}:claude-3-5-sonnet`]: Claude3_5_Sonnet_Vertex,
		[`${ANTHROPIC_VERTEX_SERVICE}:claude-3-opus`]: Claude3_Opus_Vertex,
	};
}

export function Claude3_Sonnet_Vertex() {
	return new AnthropicVertexLLM(
		'Claude 3 Sonnet (Vertex)',
		'claude-3-sonnet@20240229',
		(input: string) => (input.length * 3) / (1_000_000 * 3.5),
		(output: string) => (output.length * 15) / (1_000_000 * 3.5),
	);
}

export function Claude3_5_Sonnet_Vertex() {
	return new AnthropicVertexLLM(
		'Claude 3.5 Sonnet (Vertex)',
		'claude-3-5-sonnet@20240620',
		(input: string) => (input.length * 3) / (1_000_000 * 3.5),
		(output: string) => (output.length * 15) / (1_000_000 * 3.5),
	);
}

export function Claude3_Haiku_Vertex() {
	return new AnthropicVertexLLM(
		'Claude 3 Haiku (Vertex)',
		'claude-3-haiku@20240307',
		(input: string) => (input.length * 0.25) / (1_000_000 * 3.5),
		(output: string) => (output.length * 1.25) / (1_000_000 * 3.5),
	);
}

export function Claude3_Opus_Vertex() {
	return new AnthropicVertexLLM(
		'Claude 3 Opus (Vertex)',
		'claude-3-opus@20240229',
		(input: string) => (input.length * 15) / (1_000_000 * 3.5),
		(output: string) => (output.length * 75) / (1_000_000 * 3.5),
	);
}

export function ClaudeVertexLLMs(): AgentLLMs {
	const hard = Claude3_5_Sonnet_Vertex();
	return {
		easy: Claude3_Haiku_Vertex(),
		medium: hard,
		hard: hard,
		xhard: hard,
	};
}

/**
 * Anthropic Claude 3 through Google Cloud Vertex
 * @see https://github.com/anthropics/anthropic-sdk-typescript/tree/main/packages/vertex-sdk
 */
class AnthropicVertexLLM extends BaseLLM {
	client: AnthropicVertex | undefined;

	constructor(displayName: string, model: string, calculateInputCost: (input: string) => number, calculateOutputCost: (output: string) => number) {
		super(displayName, ANTHROPIC_VERTEX_SERVICE, model, 200_000, calculateInputCost, calculateOutputCost);
	}

	private api(): AnthropicVertex {
		if (!this.client) {
			this.client = new AnthropicVertex({
				projectId: currentUser().llmConfig.vertexProjectId ?? envVar('GCLOUD_PROJECT'),
				region: currentUser().llmConfig.vertexRegion || process.env.GCLOUD_CLAUDE_REGION || envVar('GCLOUD_REGION'),
			});
		}
		return this.client;
	}

	isConfigured(): boolean {
		return Boolean(currentUser().llmConfig.vertexRegion || process.env.GCLOUD_CLAUDE_REGION || process.env.GCLOUD_REGION);
	}

	// Error when
	// {"error":{"code":400,"message":"Project `1234567890` is not allowed to use Publisher Model `projects/project-id/locations/us-central1/publishers/anthropic/models/claude-3-haiku@20240307`","status":"FAILED_PRECONDITION"}}
	@cacheRetry({ backOffMs: 5000 })
	// @logTextGeneration
	async generateText(userPrompt: string, systemPrompt?: string, opts?: GenerateTextOptions): Promise<string> {
		return await withActiveSpan(`generateText ${opts?.id ?? ''}`, async (span) => {
			const combinedPrompt = combinePrompts(userPrompt, systemPrompt);
			const maxOutputTokens = 4096;

			if (systemPrompt) span.setAttribute('systemPrompt', systemPrompt);
			span.setAttributes({
				userPrompt,
				inputChars: combinedPrompt.length,
				model: this.model,
				service: this.service,
				caller: agentContext()?.callStack.at(-1) ?? '',
			});
			if (opts?.id) span.setAttribute('id', opts.id);

			const llmCallSave: Promise<LlmCall> = appContext().llmCallService.saveRequest({
				userPrompt,
				systemPrompt,
				llmId: this.getId(),
				agentId: agentContext()?.agentId,
				callStack: agentContext()?.callStack.join(' > '),
			});
			const requestTime = Date.now();

			let message: Message;
			try {
				message = await this.api().messages.create({
					system: systemPrompt ? [{ type: 'text', text: systemPrompt }] : undefined,
					messages: [
						{
							role: 'user',
							content: userPrompt,
						},
					],
					model: this.model,
					max_tokens: maxOutputTokens,
					stop_sequences: opts?.stopSequences,
				});
			} catch (e) {
				if (this.isRetryableError(e)) {
					throw new RetryableError(e);
				}
				throw e;
			}

			// This started happening randomly!
			if (typeof message === 'string') {
				message = JSON.parse(message);
			}

			const errorMessage = message as any;
			if (errorMessage.type === 'error') {
				throw new Error(`${errorMessage.error.type} ${errorMessage.error.message}`);
			}

			if (!message.content.length) throw new Error(`Response Message did not have any content: ${JSON.stringify(message)}`);

			if (message.content[0].type !== 'text') throw new Error(`Message content type was not text. Was ${message.content[0].type}`);

			const responseText = (message.content[0] as TextBlock).text;

			const finishTime = Date.now();
			const timeToFirstToken = finishTime - requestTime;

			const llmCall: LlmCall = await llmCallSave;

			// TODO
			const inputTokens = message.usage.input_tokens;
			const outputTokens = message.usage.output_tokens;

			const inputCost = this.calculateInputCost(combinedPrompt);
			const outputCost = this.calculateOutputCost(responseText);
			const cost = inputCost + outputCost;
			addCost(cost);

			llmCall.responseText = responseText;
			llmCall.timeToFirstToken = timeToFirstToken;
			llmCall.totalTime = finishTime - requestTime;
			llmCall.cost = cost;
			llmCall.inputTokens = inputTokens;
			llmCall.outputTokens = outputTokens;

			span.setAttributes({
				inputTokens,
				outputTokens,
				response: responseText,
				inputCost: inputCost.toFixed(4),
				outputCost: outputCost.toFixed(4),
				cost: cost.toFixed(4),
				outputChars: responseText.length,
				callStack: agentContext()?.callStack.join(' > '),
			});

			try {
				await appContext().llmCallService.saveResponse(llmCall);
			} catch (e) {
				// queue to save
				logger.error(e);
			}

			if (message.stop_reason === 'max_tokens') {
				// TODO we can replay with request with the current response appended so the LLM can complete it
				logger.error('= RESPONSE exceeded max tokens ===============================');
				logger.debug(responseText);
				throw new MaxTokensError(maxOutputTokens, responseText);
			}
			return responseText;
		});
	}

	// Error when
	// {"error":{"code":400,"message":"Project `1234567890` is not allowed to use Publisher Model `projects/project-id/locations/us-central1/publishers/anthropic/models/claude-3-haiku@20240307`","status":"FAILED_PRECONDITION"}}
	@cacheRetry({ backOffMs: 5000 })
	async generateTextFromMessages(messages: LlmMessage[], opts?: GenerateTextOptions): Promise<string> {
		return await withActiveSpan(`generateText2 ${opts?.id ?? ''}`, async (span) => {
			const maxOutputTokens = this.model.includes('3-5') ? 8192 : 4096;

			let systemPrompt: string | undefined;
			if (messages[0].role === 'system') {
				systemPrompt = messages[0].text;
				span.setAttribute('systemPrompt', systemPrompt);
				messages = messages.slice(1);
			}

			const userPrompt = messages.map((msg) => msg.text).join('\n');

			span.setAttributes({
				userPrompt,
				// inputChars: combinedPrompt.length,
				model: this.model,
				service: this.service,
				caller: agentContext()?.callStack.at(-1) ?? '',
			});
			if (opts?.id) span.setAttribute('id', opts.id);

			const llmCallSave: Promise<LlmCall> = appContext().llmCallService.saveRequest({
				messages,
				llmId: this.getId(),
				agentId: agentContext()?.agentId,
				callStack: agentContext()?.callStack.join(' > '),
			});
			const requestTime = Date.now();

			let message: Message;
			try {
				let systemMessage: Anthropic.Messages.TextBlockParam[] | undefined = undefined;
				if (messages[0].role === 'system') {
					const message = messages.splice(0, 1)[0];
					systemMessage = [{ type: 'text', text: message.text }];
					// if(source.cache)
					// 	systemMessage[0].cacheControl = 'ephemeral'
				}

				const anthropicMessages: Anthropic.Messages.MessageParam[] = messages.map((message) => {
					return { role: message.role as 'user' | 'assistant', content: message.text };
				});
				message = await this.api().messages.create({
					system: systemMessage,
					messages: anthropicMessages,
					model: this.model,
					max_tokens: maxOutputTokens,
					stop_sequences: opts?.stopSequences,
				});
			} catch (e) {
				if (this.isRetryableError(e)) {
					throw new RetryableError(e);
				}
				throw e;
			}

			// This started happening randomly!
			if (typeof message === 'string') {
				message = JSON.parse(message);
			}

			const errorMessage = message as any;
			if (errorMessage.type === 'error') {
				throw new Error(`${errorMessage.error.type} ${errorMessage.error.message}`);
			}

			if (!message.content.length) throw new Error(`Response Message did not have any content: ${JSON.stringify(message)}`);

			if (message.content[0].type !== 'text') throw new Error(`Message content type was not text. Was ${message.content[0].type}`);

			const responseText = (message.content[0] as TextBlock).text;

			const finishTime = Date.now();
			const timeToFirstToken = finishTime - requestTime;

			const llmCall: LlmCall = await llmCallSave;

			// TODO
			const inputTokens = message.usage.input_tokens;
			const outputTokens = message.usage.output_tokens;

			// const inputCost = this.calculateInputCost(combinedPrompt);
			// const outputCost = this.calculateOutputCost(responseText);
			// const cost = inputCost + outputCost;
			// addCost(cost);

			llmCall.responseText = responseText;
			llmCall.timeToFirstToken = timeToFirstToken;
			llmCall.totalTime = finishTime - requestTime;
			// llmCall.cost = cost;
			llmCall.inputTokens = inputTokens;
			llmCall.outputTokens = outputTokens;

			span.setAttributes({
				inputTokens,
				outputTokens,
				response: responseText,
				// inputCost: inputCost.toFixed(4),
				// outputCost: outputCost.toFixed(4),
				// cost: cost.toFixed(4),
				outputChars: responseText.length,
				callStack: agentContext()?.callStack.join(' > '),
			});

			try {
				await appContext()?.llmCallService.saveResponse(llmCall);
			} catch (e) {
				// queue to save
				logger.error(e);
			}

			if (message.stop_reason === 'max_tokens') {
				// TODO we can replay with request with the current response appended so the LLM can complete it
				logger.error('= RESPONSE exceeded max tokens ===============================');
				logger.debug(responseText);
				throw new MaxTokensError(maxOutputTokens, responseText);
			}
			return responseText;
		});
	}

	isRetryableError(e: any) {
		if (e.status === 429 || e.status === 529) return true;
		if (e.error?.code === 429 || e.error?.code === 529) return true;
		return e.error?.error?.code === 429 || e.error?.error?.code === 529;
	}
}
