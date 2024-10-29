import { AnthropicProvider, createAnthropic } from '@ai-sdk/anthropic';
import { LanguageModelV1 } from 'ai';
import { AgentLLMs } from '#agent/agentContextTypes';
import { AiLLM } from '#llm/services/ai-llm';
import { currentUser } from '#user/userService/userContext';
import { envVar } from '#utils/env-var';
import { LLM } from '../llm';
import { MultiLLM } from '../multi-llm';

export const ANTHROPIC_SERVICE = 'anthropic';

export function anthropicLLMRegistry(): Record<string, () => LLM> {
	return {
		[`${ANTHROPIC_SERVICE}:claude-3-haiku`]: Claude3_Haiku,
		[`${ANTHROPIC_SERVICE}:claude-3-5-sonnet`]: Claude3_5_Sonnet,
		[`${ANTHROPIC_SERVICE}:claude-3-opus`]: Claude3_Opus,
	};
}

// https://docs.anthropic.com/en/docs/glossary#tokens
// For Claude, a token approximately represents 3.5 English characters
export function Claude3_Opus() {
	return new Anthropic(
		'Claude 3 Opus',
		'claude-3-opus-20240229',
		(input: string) => (input.length * 15) / (1_000_000 * 3.5),
		(output: string) => (output.length * 75) / (1_000_000 * 3.5),
	);
}

export function Claude3_5_Sonnet() {
	return new Anthropic(
		'Claude 3.5 Sonnet',
		'claude-3-5-sonnet-20241022',
		(input: string) => (input.length * 3) / (1_000_000 * 3.5),
		(output: string) => (output.length * 15) / (1_000_000 * 3.5),
	);
}

export function Claude3_Haiku() {
	return new Anthropic(
		'Claude 3 Haiku',
		'claude-3-haiku-20240307',
		(input: string) => (input.length * 0.25) / (1_000_000 * 3.5),
		(output: string) => (output.length * 1.25) / (1_000_000 * 3.5),
	);
}

export function anthropicLLmFromModel(model: string): LLM | null {
	if (model.startsWith('claude-3-5-sonnet-')) return Claude3_5_Sonnet();
	if (model.startsWith('claude-3-haiku-')) return Claude3_Haiku();
	if (model.startsWith('claude-3-opus-')) return Claude3_Opus();
	return null;
}

export function ClaudeLLMs(): AgentLLMs {
	const sonnet35 = Claude3_5_Sonnet();
	return {
		easy: Claude3_Haiku(),
		medium: sonnet35,
		hard: sonnet35,
		xhard: new MultiLLM([sonnet35], 5),
	};
}

export class Anthropic extends AiLLM<AnthropicProvider> {
	constructor(displayName: string, model: string, calculateInputCost: (input: string) => number, calculateOutputCost: (output: string) => number) {
		super(displayName, ANTHROPIC_SERVICE, model, 200_000, calculateInputCost, calculateOutputCost);
	}

	protected apiKey(): string {
		return currentUser().llmConfig.anthropicKey || process.env.ANTHROPIC_API_KEY;
	}

	provider(): AnthropicProvider {
		if (!this.aiProvider) {
			this.aiProvider = createAnthropic({
				apiKey: this.apiKey(),
			});
		}
		return this.aiProvider;
	}
}
