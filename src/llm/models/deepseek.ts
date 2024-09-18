import axios from 'axios';
import { addCost, agentContext } from '#agent/agentContextLocalStorage';
import { LlmCall } from '#llm/llmCallService/llmCall';
import { CallerId } from '#llm/llmCallService/llmCallService';
import { withSpan } from '#o11y/trace';
import { currentUser } from '#user/userService/userContext';
import { sleep } from '#utils/async-utils';
import { envVar } from '#utils/env-var';
import { appContext } from '../../app';
import { RetryableError } from '../../cache/cacheRetry';
import { BaseLLM } from '../base-llm';
import { GenerateTextOptions, LLM, combinePrompts, logTextGeneration } from '../llm';

export const DEEPSEEK_SERVICE = 'deepseek';

export function deepseekLLMRegistry(): Record<string, () => LLM> {
	return {
		[`${DEEPSEEK_SERVICE}:deepseek-chat`]: () => deepseekChat(),
	};
}

export function deepseekChat(): LLM {
	return new DeepseekLLM(
		'DeepSeek Chat',
		'deepseek-chat',
		32000,
		(input: string) => (input.length * 0.14) / (1_000_000 * 3.5),
		(output: string) => (output.length * 0.28) / (1_000_000 * 3.5),
	);
}

/**
 * Deepseek models
 * @see https://platform.deepseek.com/api-docs/api/create-chat-completion
 */
export class DeepseekLLM extends BaseLLM {
	_client: any;

	client() {
		if (!this._client) {
			this._client = axios.create({
				baseURL: 'https://api.deepseek.com',
				headers: {
					Authorization: `Bearer ${currentUser().llmConfig.deepseekKey || envVar('DEEPSEEK_API_KEY')}`,
				},
			});
		}
		return this._client;
	}

	isConfigured(): boolean {
		return Boolean(currentUser().llmConfig.deepseekKey || process.env.DEEPSEEK_API_KEY);
	}

	constructor(
		displayName: string,
		model: string,
		maxTokens: number,
		inputCostPerToken: (input: string) => number,
		outputCostPerToken: (output: string) => number,
	) {
		super(displayName, DEEPSEEK_SERVICE, model, maxTokens, inputCostPerToken, outputCostPerToken);
	}

	async generateText(userPrompt: string, systemPrompt?: string, opts?: GenerateTextOptions): Promise<string> {
		return withSpan(`generateText ${opts?.id ?? ''}`, async (span) => {
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

			const messages = [];
			if (systemPrompt) {
				messages.push({
					role: 'system',
					content: systemPrompt,
				});
			}
			messages.push({
				role: 'user',
				content: userPrompt,
			});

			try {
				const response = await this.client().post('/chat/completions', {
					messages,
					model: this.model,
				});

				const responseText = response.data.choices[0].message.content;

				const inputCacheHitTokens = response.data.prompt_cache_hit_tokens;
				const inputCacheMissTokens = response.data.prompt_cache_miss_tokens;
				const outputTokens = response.data.completion_tokens;

				console.log(response.data);

				const timeToFirstToken = Date.now() - requestTime;
				const finishTime = Date.now();
				const llmCall: LlmCall = await llmCallSave;

				const inputCost = (inputCacheHitTokens * 0.014) / 1_000_000 + (inputCacheMissTokens * 0.14) / 1_000_000;

				const outputCost = (outputTokens * 0.28) / 1_000_000;
				const cost = inputCost + outputCost;
				addCost(cost);

				llmCall.responseText = responseText;
				llmCall.timeToFirstToken = timeToFirstToken;
				llmCall.totalTime = finishTime - requestTime;
				llmCall.cost = cost;

				try {
					await appContext().llmCallService.saveResponse(llmCall);
				} catch (e) {
					// queue to save
					console.error(e);
				}

				span.setAttributes({
					response: responseText,
					timeToFirstToken,
					inputCacheHitTokens,
					inputCacheMissTokens,
					outputTokens,
					inputCost,
					outputCost,
					cost,
					outputChars: responseText.length,
				});

				return responseText;
			} catch (e) {
				// Free accounts are limited to 1 query/second
				if (e.message.includes('rate limiting')) {
					await sleep(1000);
					throw new RetryableError(e);
				}
				throw e;
			}
		});
	}

	isRetryableError(e: any): boolean {
		return e.message.includes('rate limiting');
	}
}
