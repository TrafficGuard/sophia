import { createCerebras } from '@ai-sdk/cerebras';
import { OpenAIProvider } from '@ai-sdk/openai';
import { currentUser } from '#user/userService/userContext';
import { envVar } from '#utils/env-var';
import { LLM } from '../llm';
import { AiLLM } from './ai-llm';

export const CEREBRAS_SERVICE = 'cerebras';

export function cerebrasLLMRegistry(): Record<string, () => LLM> {
	return {
		'cerebras:llama3.1-8b': () => cerebrasLlama3_8b(),
		'cerebras:llama-3.3-70b': () => cerebrasLlama3_3_70b(),
	};
}

export function cerebrasLlama3_8b(): LLM {
	return new CerebrasLLM(
		'Llama 3.1 8b (Cerebras)',
		'llama3.1-8b',
		8_192,
		(input: string) => 0, //(input.length * 0.05) / (1_000_000 * 4),
		(output: string) => 0, //(output.length * 0.08) / (1_000_000 * 4),
		0,
		0,
	);
}

export function cerebrasLlama3_3_70b(): LLM {
	return new CerebrasLLM(
		'Llama 3.3 70b (Cerebras)',
		'llama-3.3-70b',
		8_192,
		(input: string) => 0, //(input.length * 0.05) / (1_000_000 * 4),
		(output: string) => 0, //(output.length * 0.08) / (1_000_000 * 4),
		0.6,
		0.6,
	);
}

/**
 * https://inference-docs.cerebras.ai/introduction
 */
export class CerebrasLLM extends AiLLM<OpenAIProvider> {
	constructor(
		displayName: string,
		model: string,
		maxInputTokens: number,
		calculateInputCost: (input: string) => number,
		calculateOutputCost: (output: string) => number,
		private costPerMillionInputTokens: number,
		private costPerMillionOutputTokens: number,
	) {
		super(displayName, CEREBRAS_SERVICE, model, maxInputTokens, calculateInputCost, calculateOutputCost);
	}

	protected provider(): any {
		return createCerebras({
			apiKey: this.apiKey(),
		});
	}

	protected apiKey(): string | undefined {
		return currentUser().llmConfig.cerebrasKey || envVar('CEREBRAS_API_KEY');
	}
}
