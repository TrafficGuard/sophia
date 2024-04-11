import Anthropic from '@anthropic-ai/sdk';
import { WorkflowLLMs, addCost, workflowContext } from '../../agent/workflows';
import { envVar } from '../../utils/env-var';
import { BaseLLM } from '../base-llm';
import { MaxTokensError } from '../errors';
import { logTextGeneration } from '../llm';
import { MultiLLM } from '../multi-llm';
import Message = Anthropic.Message;

export function Claude3_Opus() {
	return new Claude('claude-3-opus-20240229', 15 / 1_000_000, 75 / 1_000_000);
}

export function Claude3_Sonnet() {
	return new Claude('claude-3-sonnet-20240229', 3 / 1_000_000, 15 / 1_000_000);
}

export function Claude3_Haiku() {
	return new Claude('claude-3-haiku-20240307', 0.25 / 1_000_000, 1.25 / 1_000_000);
}

export function ClaudeLLMs(): WorkflowLLMs {
	const opus = Claude3_Opus();
	return {
		easy: Claude3_Haiku(),
		medium: Claude3_Sonnet(),
		hard: opus,
		xhard: new MultiLLM([opus], 5),
	};
}

export class Claude extends BaseLLM {
	anthropic: Anthropic;
	constructor(model: string, inputCostPerToken = 0, outputCostPerToken = 0) {
		super(model, 200_000, inputCostPerToken, outputCostPerToken);
		this.anthropic = new Anthropic({ apiKey: envVar('ANTHROPIC_API_KEY') });
	}

	@logTextGeneration
	async generateText(prompt: string, systemPrompt?: string): Promise<string> {
		let message: Message;
		try {
			message = await this.anthropic.messages.create({
				max_tokens: 4096,
				system: systemPrompt,
				messages: [{ role: 'user', content: prompt }],
				model: this.model,
				stop_sequences: ['</response>'], // This is needed otherwise it can hallucinate the function response and continue on
			});
		} catch (e) {
			console.log(e);
			console.log(Object.keys(e));
			throw e;
		}

		const inputTokens = message.usage.input_tokens;
		const outputTokens = message.usage.output_tokens;
		const stopReason = message.stop_reason;

		const inputCost = this.getInputCostPerToken() * inputTokens;
		const outputCost = this.getOutputCostPerToken() * outputTokens;
		const totalCost = inputCost + outputCost;
		console.log('inputCost', inputCost);
		console.log('outputCost', outputCost);
		addCost(totalCost);

		// TODO handle if there is a type != text
		const response = message.content.map((content) => content.text).join();

		if (stopReason === 'max_tokens') {
			throw new MaxTokensError(this.getMaxInputTokens(), response);
		}

		return response;
	}
}
