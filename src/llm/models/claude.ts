import Anthropic from '@anthropic-ai/sdk';
import { AgentLLMs, addCost } from '#agent/agentContext';
import { envVar } from '#utils/env-var';
import { BaseLLM } from '../base-llm';
import { MaxTokensError } from '../errors';
import { LLM, combinePrompts, logTextGeneration } from '../llm';
import { MultiLLM } from '../multi-llm';
import Message = Anthropic.Message;
import { withSpan } from '#o11y/trace';

export const ANTHROPIC_SERVICE = 'anthropic';

export function Claude3_Opus() {
	return new Claude('claude-3-opus-20240229', 15 / 1_000_000, 75 / 1_000_000);
}

export function Claude3_Sonnet() {
	return new Claude('claude-3-sonnet-20240229', 3 / 1_000_000, 15 / 1_000_000);
}

export function Claude3_Haiku() {
	return new Claude('claude-3-haiku-20240307', 0.25 / 1_000_000, 1.25 / 1_000_000);
}

export function anthropicLLmFromModel(model: string): LLM | null {
	if (model.startsWith('claude-3-sonnet-')) return Claude3_Sonnet();
	if (model.startsWith('claude-3-haiku-')) return Claude3_Haiku();
	if (model.startsWith('claude-3-opus-')) return Claude3_Opus();
	return null;
}

export function ClaudeLLMs(): AgentLLMs {
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
		super(ANTHROPIC_SERVICE, model, 200_000, inputCostPerToken, outputCostPerToken);
		this.anthropic = new Anthropic({ apiKey: envVar('ANTHROPIC_API_KEY') });
	}

	@logTextGeneration
	async generateText(userPrompt: string, systemPrompt?: string): Promise<string> {
		return withSpan('generateText', async (span) => {
			const prompt = combinePrompts(userPrompt, systemPrompt);

			if (systemPrompt) span.setAttribute('systemPrompt', systemPrompt);
			span.setAttributes({
				userPrompt,
				inputChars: prompt.length,
				model: this.model,
			});

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

			// TODO handle if there is a type != text
			const response = message.content.map((content) => content.text).join();

			const inputTokens = message.usage.input_tokens;
			const outputTokens = message.usage.output_tokens;
			const stopReason = message.stop_reason;

			const inputCost = this.getInputCostPerToken() * inputTokens;
			const outputCost = this.getOutputCostPerToken() * outputTokens;
			const cost = inputCost + outputCost;
			console.log('inputCost', inputCost);
			console.log('outputCost', outputCost);
			span.setAttributes({
				inputTokens,
				outputTokens,
				response,
				inputCost,
				outputCost,
				cost,
				outputChars: response.length,
			});

			addCost(cost);

			if (stopReason === 'max_tokens') {
				throw new MaxTokensError(this.getMaxInputTokens(), response);
			}

			return response;
		});
	}
}

// error: {
// 	type: 'error',
// 		error: {
// 		type: 'invalid_request_error',
// 			message: 'Your credit balance is too low to access the Claude API. Please go to Plans & Billing to upgrade or purchase credits.'
// 	}
// }
