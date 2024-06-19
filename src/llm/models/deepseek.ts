import axios from 'axios';
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
import { LLM, combinePrompts, logTextGeneration } from '../llm';

export const DEEPSEEK_SERVICE = 'deepseek';

export function deepseekLLMRegistry(): Record<string, () => LLM> {
	return {
		[`${DEEPSEEK_SERVICE}:deepseek-model`]: () => deepseekModel(),
	};
}

// TODO get the model ids for deepseek and deepseek-code
export function deepseekModel(): LLM {
	// TODO Need to adjust for tokens https://platform.deepseek.com/api-docs/faq#how-to-calculate-token-usage-offline
	return new DeepseekLLM('deepseek-model', 32000, 0.14 / 1_000_000, 0.28 / 1_000_000);
}

/**
 * Deepseek models
 */
export class DeepseekLLM extends BaseLLM {
	client: any;

	constructor(model: string, maxTokens: number, inputCostPerToken: number, outputCostPerToken: number) {
		super(DEEPSEEK_SERVICE, model, maxTokens, inputCostPerToken, outputCostPerToken);
		this.client = axios.create({
			baseURL: 'https://api.deepseek.com',
			headers: {
				Authorization: `Bearer ${currentUser().llmConfig.deepseekKey ?? envVar('DEEPSEEK_API_KEY')}`,
			},
		});
	}

	@logTextGeneration
	async generateText(userPrompt: string, systemPrompt: string): Promise<string> {
		return withSpan('generateText', async (span) => {
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

			try {
				const response = await this.client.post('/chat/completions', {
					messages: [
						{
							role: 'system',
							content: systemPrompt,
						},
						{
							role: 'user',
							content: userPrompt,
						},
					],
					model: this.model,
				});

				const responseText = response.data.choices[0].message.content;

				const timeToFirstToken = Date.now() - requestTime;
				const finishTime = Date.now();

				const llmRequest = await llmRequestSave;
				const llmResponse: CreateLlmResponse = {
					llmId: this.getId(),
					llmRequestId: llmRequest.id,
					responseText,
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
					timeToFirstToken,
					inputCost,
					outputCost,
					cost,
					outputChars: responseText.length,
				});

				addCost(cost);

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
