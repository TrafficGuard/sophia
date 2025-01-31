import { OpenAIProvider, createOpenAI } from '@ai-sdk/openai';
import { InputCostFunction, OutputCostFunction } from '#llm/base-llm';
import { AiLLM } from '#llm/services/ai-llm';
import { logger } from '#o11y/logger';
import { currentUser } from '#user/userService/userContext';
import { GenerateTextOptions, LLM, LlmMessage } from '../llm';

export const NEBIUS_SERVICE = 'nebius';

export function nebiusLLMRegistry(): Record<string, () => LLM> {
	return {
		'nebius:deepseek-ai/DeepSeek-R1': nebiusDeepSeekR1,
	};
}

export function nebiusDeepSeekR1() {
	return new NebiusLLM(
		'DeepSeek R1 (Nebius)',
		'deepseek-ai/DeepSeek-R1',
		(input: string, tokens: number) => (tokens * 0.8) / 1_000_000,
		(output: string, tokens: number) => (tokens * 2.4) / 1_000_000,
	);
}

export class NebiusLLM extends AiLLM<OpenAIProvider> {
	constructor(displayName: string, model: string, calculateInputCost: InputCostFunction, calculateOutputCost: OutputCostFunction) {
		super(displayName, NEBIUS_SERVICE, model, 128_000, calculateInputCost, calculateOutputCost);
	}

	protected apiKey(): string {
		return currentUser().llmConfig.nebiusKey || process.env.NEBIUS_API_KEY;
	}

	provider(): OpenAIProvider {
		this.aiProvider ??= createOpenAI({
			baseURL: 'https://api.studio.nebius.ai/v1/',
			apiKey: this.apiKey(),
		});
		return this.aiProvider;
	}
}
