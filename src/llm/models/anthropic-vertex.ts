import Anthropic from '@anthropic-ai/sdk';
import { AnthropicVertex } from '@anthropic-ai/vertex-sdk';
import { AgentLLMs, addCost, agentContext } from '#agent/agentContext';
import { BaseLLM } from '../base-llm';
import { MaxTokensError } from '../errors';
import { LLM, combinePrompts, logTextGeneration } from '../llm';
import Message = Anthropic.Message;
import { CallerId } from '#llm/llmCallService/llmCallService';
import { CreateLlmResponse } from '#llm/llmCallService/llmRequestResponse';
import { logger } from '#o11y/logger';
import { withActiveSpan } from '#o11y/trace';
import { currentUser } from '#user/userService/userContext';
import { envVar } from '#utils/env-var';
import { appContext } from '../../app';
import { RetryableError, cacheRetry } from '../../cache/cacheRetry';
import { MultiLLM } from '../multi-llm';

export const ANTHROPIC_VERTEX_SERVICE = 'anthropic-vertex';

export function anthropicVertexLLMRegistry(): Record<string, () => LLM> {
	return {
		[`${ANTHROPIC_VERTEX_SERVICE}:claude-3-haiku`]: Claude3_Haiku_Vertex,
		[`${ANTHROPIC_VERTEX_SERVICE}:claude-3-sonnet`]: Claude3_Sonnet_Vertex,
		[`${ANTHROPIC_VERTEX_SERVICE}:claude-3-opus`]: Claude3_Opus_Vertex,
	};
}

export function Claude3_Sonnet_Vertex() {
	return new AnthropicVertexLLM('claude-3-sonnet@20240229', 3 / (1_000_000 * 3.5), 15 / (1_000_000 * 3.5));
}

export function Claude3_Haiku_Vertex() {
	return new AnthropicVertexLLM('claude-3-haiku@20240307', 0.25 / (1_000_000 * 3.5), 1.25 / (1_000_000 * 3.5));
}

export function Claude3_Opus_Vertex() {
	return new AnthropicVertexLLM('claude-3-opus@20240229', 15 / (1_000_000 * 3.5), 75 / (1_000_000 * 3.5));
}

export function ClaudeVertexLLMs(): AgentLLMs {
	const hard = Claude3_Opus_Vertex();
	return {
		easy: Claude3_Haiku_Vertex(),
		medium: Claude3_Sonnet_Vertex(),
		hard: hard,
		xhard: new MultiLLM([hard], 5),
	};
}

/**
 * Anthropic Claude 3 through Google Cloud Vertex
 * @see https://github.com/anthropics/anthropic-sdk-typescript/tree/main/packages/vertex-sdk
 */
class AnthropicVertexLLM extends BaseLLM {
	client: AnthropicVertex | undefined;

	constructor(model: string, inputCostPerChar = 0, outputCostPerChar = 0) {
		super(ANTHROPIC_VERTEX_SERVICE, model, 200_000, inputCostPerChar, outputCostPerChar);
		// logger.info(currentUser().llmConfig.vertexProjectId ?? envVar('GCLOUD_PROJECT'));
		// logger.info(currentUser().llmConfig.vertexRegion ?? envVar('GCLOUD_REGION'));
	}

	private api(): AnthropicVertex {
		if (this.client) {
			this.client = new AnthropicVertex({
				projectId: currentUser().llmConfig.vertexProjectId ?? envVar('GCLOUD_PROJECT'),
				region: currentUser().llmConfig.vertexRegion ?? envVar('GCLOUD_REGION'),
			});
		}
		return this.client;
	}

	// Error when
	// {"error":{"code":400,"message":"Project `1234567890` is not allowed to use Publisher Model `projects/project-id/locations/us-central1/publishers/anthropic/models/claude-3-haiku@20240307`","status":"FAILED_PRECONDITION"}}
	@cacheRetry({ backOffMs: 5000 })
	@logTextGeneration
	async generateText(userPrompt: string, systemPrompt?: string): Promise<string> {
		return withActiveSpan('generateText', async (span) => {
			const prompt = combinePrompts(userPrompt, systemPrompt);
			const maxTokens = 4096;

			if (systemPrompt) span.setAttribute('systemPrompt', systemPrompt);
			span.setAttributes({
				userPrompt,
				inputChars: prompt.length,
				model: this.model,
				caller: agentContext().callStack.at(-1) ?? '',
			});

			const caller: CallerId = { agentId: agentContext().agentId };
			const llmRequestSave = appContext().llmCallService.saveRequest(userPrompt, systemPrompt);
			const requestTime = Date.now();

			let message: Message;
			try {
				message = await this.api().messages.create({
					messages: [
						{
							role: 'user',
							content: prompt,
						},
					],
					model: this.model,
					max_tokens: maxTokens,
					stop_sequences: ['</response>'], // This is needed otherwise it can hallucinate the function response and continue on
				});
			} catch (e) {
				if (this.isRetryableError(e)) {
					throw new RetryableError(e);
				}
				throw e;
			}

			// appCtx().
			if (!message.content.length) throw new Error(`Response Message did not have any content: ${JSON.stringify(message)}`);
			const responseText = message.content[0].text;

			const timeToFirstToken = Date.now();
			const finishTime = Date.now();

			const llmRequest = await llmRequestSave;
			const llmResponse: CreateLlmResponse = {
				llmId: this.getId(),
				llmRequestId: llmRequest.id,
				responseText: responseText,
				requestTime,
				timeToFirstToken: timeToFirstToken,
				totalTime: finishTime - requestTime,
			};
			await appContext().llmCallService.saveResponse(llmRequest.id, caller, llmResponse);

			const inputTokens = message.usage.input_tokens;
			const outputTokens = message.usage.output_tokens;
			const inputCost = this.getInputCostPerToken() * message.usage.input_tokens;
			const outputCost = this.getOutputCostPerToken() * message.usage.output_tokens;
			const cost = inputCost + outputCost;
			addCost(cost);

			span.setAttributes({
				inputTokens,
				outputTokens,
				response: responseText,
				inputCost,
				outputCost,
				cost,
				outputChars: responseText.length,
			});

			if (message.stop_reason === 'max_tokens') {
				// TODO we can replay with request with the current response appended so the LLM can complete it
				logger.error('= RESPONSE exceeded max tokens ===============================');
				logger.debug(responseText);
				throw new MaxTokensError(maxTokens, responseText);
			}
			return responseText;
		});
	}

	isRetryableError(e: any) {
		if (e.status === 429) return true;
		if (e.error?.code === 429) return true;
		return e.error?.error?.code === 429;
	}
}
