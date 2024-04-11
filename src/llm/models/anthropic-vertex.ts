import Anthropic from '@anthropic-ai/sdk';
import { AnthropicVertex } from '@anthropic-ai/vertex-sdk';
import { WorkflowLLMs, addCost } from '../../agent/workflows';
import { BaseLLM } from '../base-llm';
import { MaxTokensError } from '../errors';
import { combinePrompts, logTextGeneration } from '../llm';
import Message = Anthropic.Message;
import { RetryableError } from '../../cache/cache';
import { envVar } from '../../utils/env-var';
import { MultiLLM } from '../multi-llm';

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

export function ClaudeVertexLLMs(): WorkflowLLMs {
	const hard = Claude3_Sonnet_Vertex();
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
	// Reads from the `CLOUD_ML_REGION` & `ANTHROPIC_VERTEX_PROJECT_ID` environment variables.
	// Additionally goes through the standard `google-auth-library` flow.
	client = new AnthropicVertex({
		projectId: envVar('VERTEX_PROJECT_ID'),
		region: envVar('VERTEX_REGION'),
	});

	constructor(model: string, inputCostPerToken = 0, outputCostPerToken = 0) {
		super(model, 200_000, inputCostPerToken, outputCostPerToken);
	}
	// Error when
	// {"error":{"code":400,"message":"Project `1234567890` is not allowed to use Publisher Model `projects/project-id/locations/us-central1/publishers/anthropic/models/claude-3-haiku@20240307`","status":"FAILED_PRECONDITION"}}
	@logTextGeneration
	async generateText(userPrompt: string, systemPrompt?: string): Promise<string> {
		const prompt = combinePrompts(userPrompt, systemPrompt);
		const maxTokens = 4096;

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

		const inputCost = this.getInputCostPerToken() * message.usage.input_tokens;
		const outputCost = this.getOutputCostPerToken() * message.usage.output_tokens;
		const totalCost = inputCost + outputCost;
		console.log('inputCost', inputCost);
		console.log('outputCost', outputCost);
		addCost(totalCost);

		if (message.stop_reason === 'max_tokens') {
			throw new MaxTokensError(maxTokens, message.content[0].text);
		}
		return message.content[0].text;
	}

	isRetryableError(e: any) {
		if (e.status === 429) return true;
		if (e.error?.code === 429) return true;
		return e.error?.error?.code === 429;
	}
}
