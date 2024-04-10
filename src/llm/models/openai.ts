import OpenAI from 'openai';
import { addCost } from '../../agent/workflows';
import { BaseLLM } from '../base-llm';
import { logTextGeneration } from '../llm';

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

export function GPT4() {
	return new GPT('gpt-4-turbo-preview', 0.03 / 1000, 0.06 / 1000);
}

export class GPT extends BaseLLM {
	openai = new OpenAI({
		apiKey: process.env.OPENAI_API_KEY,
	});

	constructor(model: Model, inputCostPerToken: number, outputCostPerToken: number) {
		super(model, maxTokens(model), inputCostPerToken, outputCostPerToken);
	}

	@logTextGeneration
	async generateText(prompt: string): Promise<string> {
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
		const totalCost = inputCost + outputCost;
		addCost(totalCost);
		return response;
	}
}
