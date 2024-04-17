import OpenAI from 'openai';
import { addCost } from '#agent/agentContext';
import { withSpan } from '#o11y/trace';
import { BaseLLM } from '../base-llm';
import { LLM, combinePrompts, logTextGeneration } from '../llm';

type Model = 'gpt-4-turbo-preview' | 'gpt-4-vision-preview' | 'gpt-4' | 'gpt-4-32k' | 'gpt-3.5-turbo' | 'gpt-3.5-turbo-16k';

// https://platform.openai.com/docs/models/gpt-4-and-gpt-4-turbo
function maxTokens(model: Model) {
	switch (model) {
		case 'gpt-4-turbo-preview':
			return 128_000;
		default:
			throw new Error(`Need to configure max token input for ${model} in ${__filename}`);
	}
}

export const OPENAI_SERVICE = 'openai';

export function openaiLLmFromModel(model: string): LLM {
	if (model.startsWith('gpt-4-turbo')) return GPT4();
	throw new Error(`Unsupported ${OPENAI_SERVICE} model: ${model}`)
}

export function GPT4() {
	return new GPT('gpt-4-turbo-preview', 0.03 / 1000, 0.06 / 1000);
}

export class GPT extends BaseLLM {
	openai = new OpenAI({
		apiKey: process.env.OPENAI_API_KEY,
	});

	constructor(model: Model, inputCostPerToken: number, outputCostPerToken: number) {
		super(OPENAI_SERVICE, model, maxTokens(model), inputCostPerToken, outputCostPerToken);
	}

	@logTextGeneration
	async generateText(userPrompt: string, systemPrompt: string): Promise<string> {
		return withSpan('generateText', async (span) => {
			const prompt = combinePrompts(userPrompt, systemPrompt);

			if (systemPrompt) span.setAttribute('systemPrompt', systemPrompt);
			span.setAttributes({
				userPrompt,
				inputChars: prompt.length,
				model: this.model,
			});

			const stream = await this.openai.chat.completions.create({
				model: this.model,
				messages: [{ role: 'user', content: prompt }],
				stream: true,
			});
			let response = '';
			for await (const chunk of stream) {
				response += chunk.choices[0]?.delta?.content || '';
			}
			const inputCost = this.getInputCostPerToken() * prompt.length;
			const outputCost = this.getOutputCostPerToken() * response.length;
			const cost = inputCost + outputCost;
			span.setAttributes({
				inputChars: prompt.length,
				outputChars: response.length,
				response,
				inputCost,
				outputCost,
				cost,
			});

			addCost(cost);

			return response;
		});
	}
}
