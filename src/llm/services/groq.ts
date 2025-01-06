import { GroqProvider, createGroq } from '@ai-sdk/groq';
import { AiLLM } from '#llm/services/ai-llm';
import { currentUser } from '#user/userService/userContext';
import { LLM } from '../llm';

export const GROQ_SERVICE = 'groq';

export function groqLLMRegistry(): Record<string, () => LLM> {
	return {
		'groq:llama-3.3-70b-versatile': groqLlama3_3_70B,
	};
}

// Pricing and model ids at
// https://groq.com/pricing/
// https://console.groq.com/docs/models

export function groqLlama3_3_70B(): LLM {
	return new GroqLLM(
		'Llama3.3 70b (Groq)',
		'llama-3.3-70b-versatile',
		131_072,
		(input: string) => (input.length * 0.59) / (1_000_000 * 4),
		(output: string) => (output.length * 0.79) / (1_000_000 * 4),
	);
}

/**
 * https://wow.groq.com/
 */
export class GroqLLM extends AiLLM<GroqProvider> {
	constructor(
		displayName: string,
		model: string,
		maxTokens: number,
		calculateInputCost: (input: string) => number,
		calculateOutputCost: (output: string) => number,
	) {
		super(displayName, GROQ_SERVICE, model, maxTokens, calculateInputCost, calculateOutputCost);
	}

	protected apiKey(): string {
		return currentUser().llmConfig.groqKey || process.env.GROQ_API_KEY;
	}

	provider(): GroqProvider {
		this.aiProvider ??= createGroq({
			apiKey: this.apiKey() ?? '',
		});

		return this.aiProvider;
	}
}
