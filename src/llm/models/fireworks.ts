import OpenAI from 'openai';
import { addCost, agentContext } from '#agent/agentContext';
import { CallerId } from '#llm/llmCallService/llmCallService';
import { CreateLlmResponse } from '#llm/llmCallService/llmRequestResponse';
import { withSpan } from '#o11y/trace';
import { currentUser } from '#user/userService/userContext';
import { sleep } from '#utils/async-utils';
import { envVar } from '#utils/env-var';
import { appContext } from '../../app';
import { RetryableError } from '../../cache/cacheRetry';
import { BaseLLM } from '../base-llm';
import { GenerateTextOptions, LLM, combinePrompts, logTextGeneration } from '../llm';

export const FIREWORKS_SERVICE = 'fireworks';

/**
 * Fireworks AI models
 */
export class FireworksLLM extends BaseLLM {
	_client: OpenAI;

	client(): OpenAI {
		if (!this._client) {
			this._client = new OpenAI({
				apiKey: currentUser().llmConfig.fireworksKey ?? envVar('FIREWORKS_KEY'),
				baseURL: 'https://api.fireworks.ai/inference/v1',
			});
		}
		return this._client;
	}

	constructor(displayName: string, model: string, maxTokens: number, inputCostPerToken: number, outputCostPerToken: number) {
		super(displayName, FIREWORKS_SERVICE, model, maxTokens, inputCostPerToken, outputCostPerToken);
	}

	@logTextGeneration
	async generateText(userPrompt: string, systemPrompt?: string, opts?: GenerateTextOptions): Promise<string> {
		return withSpan(`generateText ${opts?.id ?? ''}`, async (span) => {
			const prompt = combinePrompts(userPrompt, systemPrompt);

			if (systemPrompt) span.setAttribute('systemPrompt', systemPrompt);
			span.setAttributes({
				userPrompt,
				inputChars: prompt.length,
				model: this.model,
			});

			const caller: CallerId = { agentId: agentContext().agentId };
			const llmRequestSave = appContext().llmCallService.saveRequest(userPrompt, systemPrompt);
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

				const timeToFirstToken = Date.now() - requestTime;
				const finishTime = Date.now();

				const llmRequest = await llmRequestSave;
				const llmResponse: CreateLlmResponse = {
					llmId: this.getId(),
					llmRequestId: llmRequest.id,
					responseText: responseText,
					requestTime,
					timeToFirstToken: timeToFirstToken,
					totalTime: finishTime - requestTime,
					callStack: agentContext().callStack.join(' > '),
				};
				await appContext().llmCallService.saveResponse(llmRequest.id, caller, llmResponse);

				const inputCost = this.getInputCostPerToken() * prompt.length;
				const outputCost = this.getOutputCostPerToken() * responseText.length;
				const cost = inputCost + outputCost;

				span.setAttributes({
					response: responseText,
					inputCost,
					outputCost,
					cost,
					outputChars: responseText.length,
				});

				addCost(cost);

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
		[`${FIREWORKS_SERVICE}:accounts/fireworks/models/llama-v3-70b-instruct`]: fireworksLlama3_70B,
	};
}
export function fireworksLlama3_70B(): LLM {
	return new FireworksLLM('LLama3 70b-i (Fireworks)', 'accounts/fireworks/models/llama-v3-70b-instruct', 8000, 0.9 / 1_000_000, 0.9 / 1_000_000);
}

export function fireworksLLmFromModel(model: string): LLM | null {
	// if (model === 'meta-llama/Llama-3-8b-chat-hf') {
	//   return togetherLlama3_7B();
	// }
	if (model === 'accounts/fireworks/models/llama-v3-70b-instruct') {
		return fireworksLlama3_70B();
	}
	return null;
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
