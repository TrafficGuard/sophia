import { addCost } from '#agent/agentContext';
import { withActiveSpan } from '#o11y/trace';
import { BaseLLM } from '../base-llm';
import { combinePrompts } from '../llm';

export class MockLLM extends BaseLLM {
	/**
	 * @param response The response to generateText()
	 * @param maxInputTokens defaults to 100
	 */
	constructor(
		private response?: string,
		maxInputTokens = 100,
	) {
		super('mock', 'mock', maxInputTokens, 1, 1);
	}

	setResponse(response: string) {
		this.response = response;
	}

	async generateText(userPrompt: string, systemPrompt: string): Promise<string> {
		return withActiveSpan('generateText', async (span) => {
			const prompt = combinePrompts(userPrompt, systemPrompt);

			if (systemPrompt) span.setAttribute('systemPrompt', systemPrompt);
			span.setAttributes({
				userPrompt,
				inputChars: prompt.length,
				model: this.model,
			});

			if (this.response === undefined) throw new Error('Need to call setResponse on MockLLM before calling generateText');

			const response = this.response;

			const inputCost = this.getInputCostPerToken() * prompt.length;
			const outputCost = this.getOutputCostPerToken() * response.length;
			const cost = inputCost + outputCost;
			span.setAttributes({
				response,
				inputCost,
				outputCost,
				cost,
				outputChars: response.length,
			});

			addCost(cost);

			return response;
		});
	}
}
