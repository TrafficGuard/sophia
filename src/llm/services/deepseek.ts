import { DeepSeekProvider, createDeepSeek } from '@ai-sdk/deepseek';
import { currentUser } from '#user/userService/userContext';
import { envVar } from '#utils/env-var';
import { LLM } from '../llm';
import { AiLLM } from './ai-llm';

export const DEEPSEEK_SERVICE = 'deepseek';

export function deepseekLLMRegistry(): Record<string, () => LLM> {
	return {
		[`${DEEPSEEK_SERVICE}:deepseek-chat`]: deepSeekV3,
		[`${DEEPSEEK_SERVICE}:deepseek-r1`]: deepSeekR1,
	};
}

export function deepSeekV3(): LLM {
	return new DeepSeekLLM(
		'DeepSeek v3',
		'deepseek-chat',
		64000,
		(input: string) => (input.length * 0.14) / (1_000_000 * 3.5),
		(output: string) => (output.length * 0.28) / (1_000_000 * 3.5),
	);
}

export function deepSeekR1(): LLM {
	return new DeepSeekLLM(
		'DeepSeek R1',
		'deepseek-reasoner',
		64000,
		(input: string) => (input.length * 0.55) / (1_000_000 * 3.5),
		(output: string) => (output.length * 2.19) / (1_000_000 * 3.5),
	);
}

/**
 * Deepseek models
 * @see https://platform.deepseek.com/api-docs/api/create-chat-completion
 */
export class DeepSeekLLM extends AiLLM<DeepSeekProvider> {
	constructor(
		displayName: string,
		model: string,
		maxTokens: number,
		inputCostPerToken: (input: string) => number,
		outputCostPerToken: (output: string) => number,
	) {
		super(displayName, DEEPSEEK_SERVICE, model, maxTokens, inputCostPerToken, outputCostPerToken);
	}

	// https://sdk.vercel.ai/providers/ai-sdk-providers/deepseek
	protected provider(): any {
		return createDeepSeek({
			apiKey: this.apiKey(),
		});
	}

	protected apiKey(): string | undefined {
		return currentUser().llmConfig.deepseekKey || envVar('DEEPSEEK_API_KEY');
	}
}
