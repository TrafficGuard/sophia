import { Anthropic as AnthropicSdk } from '@anthropic-ai/sdk';
import { addCost, agentContext } from '#agent/agentContextLocalStorage';
import { envVar } from '#utils/env-var';
import { BaseLLM } from '../base-llm';
import { MaxTokensError } from '../errors';
import { GenerateTextOptions, LLM, combinePrompts, logTextGeneration } from '../llm';
import { MultiLLM } from '../multi-llm';
import Message = AnthropicSdk.Message;
import { LlmCall } from '#llm/llmCallService/llmCall';
import { logger } from '#o11y/logger';
import { withActiveSpan } from '#o11y/trace';
import { currentUser } from '#user/userService/userContext';
import { appContext } from '../../app';
import { RetryableError } from '../../cache/cacheRetry';
import TextBlock = AnthropicSdk.TextBlock;
import { AgentLLMs } from '#agent/agentContextTypes';
import { CallerId } from '#llm/llmCallService/llmCallService';

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
		'claude-3-5-sonnet-20240620',
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

export class Anthropic extends BaseLLM {
	anthropic: AnthropicSdk | undefined;
	constructor(displayName: string, model: string, calculateInputCost: (input: string) => number, calculateOutputCost: (output: string) => number) {
		super(displayName, ANTHROPIC_SERVICE, model, 200_000, calculateInputCost, calculateOutputCost);
	}

	private sdk(): AnthropicSdk {
		if (!this.anthropic) {
			this.anthropic = new AnthropicSdk({ apiKey: currentUser().llmConfig.anthropicKey || envVar('ANTHROPIC_API_KEY') });
		}
		return this.anthropic;
	}

	isConfigured(): boolean {
		return Boolean(currentUser().llmConfig.anthropicKey || process.env.ANTHROPIC_API_KEY);
	}

	@logTextGeneration
	async generateText(userPrompt: string, systemPrompt?: string, opts?: GenerateTextOptions): Promise<string> {
		return withActiveSpan(`generateText ${opts?.id ?? ''}`, async (span) => {
			const prompt = combinePrompts(userPrompt, systemPrompt);

			if (systemPrompt) span.setAttribute('systemPrompt', systemPrompt);
			span.setAttributes({
				userPrompt,
				inputChars: prompt.length,
				model: this.model,
				service: this.service,
			});

			const llmCallSave: Promise<LlmCall> = appContext().llmCallService.saveRequest({
				userPrompt,
				systemPrompt,
				llmId: this.getId(),
				agentId: agentContext()?.agentId,
				callStack: agentContext()?.callStack.join(' > '),
			});
			const requestTime = Date.now();

			let message: Message;
			try {
				message = await this.sdk().messages.create({
					max_tokens: 4096,
					system: systemPrompt ? [{ type: 'text', text: systemPrompt }] : undefined,
					messages: [{ role: 'user', content: prompt }],
					model: this.model,
					stop_sequences: opts?.stopSequences,
				});
			} catch (e) {
				if (e.status === 529 || e.status === 429) {
					throw new RetryableError(e);
				}
				logger.error(e);
				logger.error(Object.keys(e));
				throw e;
			}

			// TODO handle if there is a type != text
			const responseText = message.content.map((content) => (content as TextBlock).text).join();

			const timeToFirstToken = Date.now() - requestTime;
			const finishTime = Date.now();

			const llmCall: LlmCall = await llmCallSave;

			const inputTokens = message.usage.input_tokens;
			const outputTokens = message.usage.output_tokens;
			const stopReason = message.stop_reason;

			const inputCost = this.calculateInputCost(prompt);
			const outputCost = this.calculateOutputCost(responseText);
			const cost = inputCost + outputCost;
			addCost(cost);

			llmCall.responseText = responseText;
			llmCall.timeToFirstToken = timeToFirstToken;
			llmCall.totalTime = finishTime - requestTime;
			llmCall.cost = inputCost + outputCost;

			span.setAttributes({
				inputTokens,
				outputTokens,
				response: responseText,
				timeToFirstToken,
				inputCost,
				outputCost,
				cost,
				outputChars: responseText.length,
			});

			try {
				await appContext().llmCallService.saveResponse(llmCall);
			} catch (e) {
				// queue to save
				logger.error(e);
			}

			if (stopReason === 'max_tokens') {
				throw new MaxTokensError(this.getMaxInputTokens(), responseText);
			}

			return responseText;
		});
	}
}

// error: {
// 	type: 'error',
// 		error: {
// 		type: 'invalid_request_error',
// 			message: 'Your credit balance is too low to access the Claude API. Please go to Plans & Billing to upgrade or purchase credits.'
// 	}
// }
