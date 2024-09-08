import OpenAI from 'openai';
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
/**
 * Together AI models
 */
export class TogetherLLM extends BaseLLM {
	_client: OpenAI;

	client(): OpenAI {
		if (!this._client) {
			this._client = new OpenAI({
				apiKey: currentUser().llmConfig.togetheraiKey || envVar('TOGETHERAI_KEY'),
				baseURL: 'https://api.together.xyz/v1',
			});
		}
		return this._client;
	}

	isConfigured(): boolean {
		return Boolean(currentUser().llmConfig.togetheraiKey || process.env.TOGETHERAI_KEY);
	}

	constructor(
		displayName: string,
		model: string,
		maxTokens: number,
		inputCostPerToken: (input: string) => number,
		outputCostPerToken: (output: string) => number,
	) {
		super(displayName, TOGETHER_SERVICE, model, maxTokens, inputCostPerToken, outputCostPerToken);
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
				});

				const responseText = completion.choices[0].message.content;

				const timeToFirstToken = Date.now() - requestTime;
				const finishTime = Date.now();

				const llmCall: LlmCall = await llmCallSave;

				const inputCost = this.calculateInputCost(prompt);
				const outputCost = this.calculateOutputCost(responseText);
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
}
