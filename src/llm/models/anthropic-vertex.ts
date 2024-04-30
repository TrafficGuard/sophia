import Anthropic from '@anthropic-ai/sdk';
import { AnthropicVertex } from '@anthropic-ai/vertex-sdk';
import { AgentLLMs, addCost, agentContext } from '#agent/agentContext';
import { BaseLLM } from '../base-llm';
import { MaxTokensError } from '../errors';
import { LLM, combinePrompts, logTextGeneration } from '../llm';
import Message = Anthropic.Message;
import { logger } from '#o11y/logger';
import { withActiveSpan } from '#o11y/trace';
import { envVar } from '#utils/env-var';
import { RetryableError } from '../../cache/cache';
import { MultiLLM } from '../multi-llm';

export const ANTHROPIC_VERTEX_SERVICE = 'anthropic-vertex';

export function anthropicVertexLLmFromModel(model: string): LLM {
	if (model.startsWith('claude-3-sonnet@')) return Claude3_Sonnet_Vertex();
	if (model.startsWith('claude-3-haiku@')) return Claude3_Haiku_Vertex();
	if (model.startsWith('claude-3-opus@')) return Claude3_Opus_Vertex();
	throw new Error(`Unsupported ${ANTHROPIC_VERTEX_SERVICE} model: ${model}`);
}

export function Claude3_Sonnet_Vertex() {
	return new AnthropicVertexLLM('claude-3-sonnet@20240229', 3 / 1000000, 15 / 1000000);
}

export function Claude3_Haiku_Vertex() {
	return new AnthropicVertexLLM('claude-3-haiku@20240307', 0.25 / 1000000, 1.25 / 1000000);
}

// Coming soon
// https://console.cloud.google.com/vertex-ai/publishers/anthropic/model-garden/claude-3-opus?project=<projectId>&supportedpurview=project
export function Claude3_Opus_Vertex() {
	return new AnthropicVertexLLM('claude-3-opus@20240229', 15 / 1000000, 75 / 1000000);
}

export function ClaudeVertexLLMs(): AgentLLMs {
	const hard = Claude3_Sonnet_Vertex();
	return {
		easy: Claude3_Haiku_Vertex(),
		medium: Claude3_Sonnet_Vertex(),
		hard: hard,
		xhard: new MultiLLM([hard], 5),
	};
}

let client: AnthropicVertex;
function getClient() {
	if (!client) {
		// Reads from the `CLOUD_ML_REGION` & `ANTHROPIC_VERTEX_PROJECT_ID` environment variables.
		// Additionally goes through the standard `google-auth-library` flow.
		client = new AnthropicVertex({
			projectId: envVar('VERTEX_PROJECT_ID'),
			region: envVar('VERTEX_REGION'),
		});
	}
	return client;
}

/**
 * Anthropic Claude 3 through Google Cloud Vertex
 * @see https://github.com/anthropics/anthropic-sdk-typescript/tree/main/packages/vertex-sdk
 */
class AnthropicVertexLLM extends BaseLLM {
	client: AnthropicVertex;

	constructor(model: string, inputCostPerToken = 0, outputCostPerToken = 0) {
		super(ANTHROPIC_VERTEX_SERVICE, model, 200_000, inputCostPerToken, outputCostPerToken);
		this.client = getClient();
	}
	// Error when
	// {"error":{"code":400,"message":"Project `1234567890` is not allowed to use Publisher Model `projects/project-id/locations/us-central1/publishers/anthropic/models/claude-3-haiku@20240307`","status":"FAILED_PRECONDITION"}}
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

			let message: Message;
			try {
				message = await this.client.messages.create({
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

			const response = message.content[0].text;
			const inputTokens = message.usage.input_tokens;
			const outputTokens = message.usage.output_tokens;
			const inputCost = this.getInputCostPerToken() * message.usage.input_tokens;
			const outputCost = this.getOutputCostPerToken() * message.usage.output_tokens;
			const cost = inputCost + outputCost;
			addCost(cost);

			span.setAttributes({
				inputTokens,
				outputTokens,
				response,
				inputCost,
				outputCost,
				cost,
				outputChars: response.length,
			});

			if (message.stop_reason === 'max_tokens') {
				// TODO we can replay with request with the current response appended so the LLM can complete it
				logger.error('= RESPONSE exceeded max tokens ===============================');
				logger.debug(response);
				throw new MaxTokensError(maxTokens, response);
			}
			return response;
		});
	}

	isRetryableError(e: any) {
		if (e.status === 429) return true;
		if (e.error?.code === 429) return true;
		return e.error?.error?.code === 429;
	}
}
