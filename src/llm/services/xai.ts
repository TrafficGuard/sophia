import { OpenAIProvider, createOpenAI } from '@ai-sdk/openai';
import { AiLLM } from '#llm/services/ai-llm';
import { currentUser } from '#user/userService/userContext';
import { LLM } from '../llm';

export const XAI_SERVICE = 'xai';

export class XAI extends AiLLM<OpenAIProvider> {
	constructor(
		displayName: string,
		model: string,
		maxTokens: number,
		calculateInputCost: (input: string) => number,
		calculateOutputCost: (output: string) => number,
	) {
		super(displayName, XAI_SERVICE, model, maxTokens, calculateInputCost, calculateOutputCost);
	}

	protected apiKey(): string {
		return currentUser().llmConfig.xaiKey || process.env.XAI_API_KEY;
	}

	provider(): OpenAIProvider {
		if (!this.aiProvider) {
			this.aiProvider = createOpenAI({
				apiKey: this.apiKey() ?? '',
				baseURL: 'https://api.x.ai/v1',
			});
		}
		return this.aiProvider;
	}
}

export function xaiLLMRegistry(): Record<string, () => LLM> {
	return {
		[`${XAI_SERVICE}:grok-beta`]: xai_GrokBeta,
	};
}

export function xai_GrokBeta(): LLM {
	return new XAI(
		'Grok beta',
		'grok-beta',
		131_072,
		(input: string) => (input.length * 0.9) / 1_000_000 / 4,
		(output: string) => (output.length * 0.9) / 1_000_000 / 4,
	);
}
