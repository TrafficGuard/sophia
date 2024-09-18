import OpenAI from 'openai';
import { addCost, agentContext } from '#agent/agentContextLocalStorage';
import { LlmCall } from '#llm/llmCallService/llmCall';
import { withSpan } from '#o11y/trace';
import { currentUser } from '#user/userService/userContext';
import { sleep } from '#utils/async-utils';
import { envVar } from '#utils/env-var';
import { appContext } from '../../app';
import { RetryableError } from '../../cache/cacheRetry';
import { BaseLLM } from '../base-llm';
import { GenerateTextOptions, LLM, combinePrompts } from '../llm';

export const FIREWORKS_SERVICE = 'fireworks';

/**
 * Fireworks AI models
 */
export class FireworksLLM extends BaseLLM {
	_client: OpenAI;

	client(): OpenAI {
		if (!this._client) {
			this._client = new OpenAI({
				apiKey: currentUser().llmConfig.fireworksKey || envVar('FIREWORKS_KEY'),
				baseURL: 'https://api.fireworks.ai/inference/v1',
			});
		}
		return this._client;
	}

	isConfigured(): boolean {
		return Boolean(currentUser().llmConfig.fireworksKey || process.env.FIREWORKS_KEY);
	}

	constructor(
		displayName: string,
		model: string,
		maxTokens: number,
		inputCostPerToken: (input: string) => number,
		outputCostPerToken: (output: string) => number,
	) {
		super(displayName, FIREWORKS_SERVICE, model, maxTokens, inputCostPerToken, outputCostPerToken);
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
				const completion: OpenAI.ChatCompletion = await this.client().chat.completions.create({
					messages,
					model: this.model,
					max_tokens: 4094,
				});

				const responseText = completion.choices[0].message.content;

				const llmCall: LlmCall = await llmCallSave;

				const inputCost = this.calculateInputCost(prompt);
				const outputCost = this.calculateOutputCost(responseText);
				const cost = inputCost + outputCost;
				addCost(cost);

				const timeToFirstToken = Date.now() - requestTime;
				const finishTime = Date.now();

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
					inputCost,
					outputCost,
					cost,
					outputChars: responseText.length,
				});

				return responseText;
			} catch (e) {
				if (e.message.includes('rate limiting')) {
					await sleep(1000);
					throw new RetryableError(e);
				}
				throw e;
			}
		});
	}
}

export function fireworksLLMRegistry(): Record<string, () => LLM> {
	return {
		[`${FIREWORKS_SERVICE}:accounts/fireworks/models/llama-v3p1-70b-instruct`]: fireworksLlama3_70B,
		[`${FIREWORKS_SERVICE}:accounts/fireworks/models/llama-v3p1-405b-instruct`]: fireworksLlama3_405B,
	};
}

export function fireworksLlama3_70B(): LLM {
	return new FireworksLLM(
		'LLama3 70b-i (Fireworks)',
		'accounts/fireworks/models/llama-v3p1-70b-instruct',
		131_072,
		(input: string) => (input.length * 0.9) / 1_000_000 / 4,
		(output: string) => (output.length * 0.9) / 1_000_000 / 4,
	);
}

export function fireworksLlama3_405B(): LLM {
	return new FireworksLLM(
		'LLama3 405b-i (Fireworks)',
		'accounts/fireworks/models/llama-v3p1-405b-instruct',
		131_072,
		(input: string) => (input.length * 3) / 1_000_000 / 4,
		(output: string) => (output.length * 3) / 1_000_000 / 4,
	);
}

/*
  error: {
    message: 'Invalid API key provided. You can find your API key at https://api.together.xyz/settings/api-keys.',
    type: 'invalid_request_error',
    param: null,
    code: 'invalid_api_key'
  },
  code: 'invalid_api_key',
  param: null,
  type: 'invalid_request_error'
}

 */
