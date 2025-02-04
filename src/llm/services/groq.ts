import { GroqProvider, createGroq } from '@ai-sdk/groq';
import { InputCostFunction, OutputCostFunction, perMilTokens } from '#llm/base-llm';
import { AiLLM } from '#llm/services/ai-llm';
import { currentUser } from '#user/userService/userContext';
import { LLM } from '../llm';

export const GROQ_SERVICE = 'groq';

export function groqLLMRegistry(): Record<string, () => LLM> {
	return {
		'groq:llama-3.3-70b-versatile': groqLlama3_3_70B,
		'groq:deepseek-r1-distill-llama-70b': groqLlama3_3_70B_R1_Distill,
	};
}

// Pricing and model ids at
// https://groq.com/pricing/
// https://console.groq.com/docs/models

export function groqLlama3_3_70B(): LLM {
	return new GroqLLM('Llama3.3 70b (Groq)', 'llama-3.3-70b-versatile', 131_072, perMilTokens(0.59), perMilTokens(0.79));
}

export function groqLlama3_3_70B_R1_Distill(): LLM {
	return new GroqLLM('Llama3.3 70b R1 Distill (Groq)', 'deepseek-r1-distill-llama-70b', 1280_000, perMilTokens(0.59), perMilTokens(0.79));
}

/**
 * https://wow.groq.com/
 */
export class GroqLLM extends AiLLM<GroqProvider> {
	constructor(displayName: string, model: string, maxTokens: number, calculateInputCost: InputCostFunction, calculateOutputCost: OutputCostFunction) {
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
