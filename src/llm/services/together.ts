import { TogetherAIProvider, createTogetherAI } from '@ai-sdk/togetherai';
import { LanguageModelV1 } from 'ai';
import { AiLLM } from '#llm/services/ai-llm';
import { currentUser } from '#user/userService/userContext';
import { LLM } from '../llm';

export const TOGETHER_SERVICE = 'together';

export function togetherLLMRegistry(): Record<string, () => LLM> {
	return {
		[`${TOGETHER_SERVICE}:meta-llama/Llama-3-70b-chat-hf`]: () => togetherLlama3_70B(),
	};
}

export function togetherLlama3_70B(): LLM {
	return new TogetherLLM(
		'Llama3 70b (Together)',
		'meta-llama/Llama-3-70b-chat-hf',
		8000,
		(input: string) => (input.length * 0.9) / 1_000_000,
		(output: string) => (output.length * 0.9) / 1_000_000,
	);
}
type TogetherAIProviderV1 = TogetherAIProvider & {
	languageModel: (modelId: string) => LanguageModelV1;
};
/**
 * Together AI models
 */
export class TogetherLLM extends AiLLM<TogetherAIProviderV1> {
	constructor(
		displayName: string,
		model: string,
		maxTokens: number,
		inputCostPerToken: (input: string) => number,
		outputCostPerToken: (output: string) => number,
	) {
		super(displayName, TOGETHER_SERVICE, model, maxTokens, inputCostPerToken, outputCostPerToken);
	}

	protected apiKey(): string {
		return currentUser().llmConfig.togetheraiKey || process.env.TOGETHERAI_API_KEY;
	}

	provider(): TogetherAIProviderV1 {
		// @ts-ignore
		this.aiProvider ??= createTogetherAI({
			apiKey: this.apiKey(),
		});
		this.aiProvider.languageModel = (modelId) => this.aiProvider(modelId);
		return this.aiProvider;
	}
}
