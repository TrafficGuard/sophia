import OpenAI from 'openai';
import { addCost, agentContext } from '#agent/agentContext';
import { withSpan } from '#o11y/trace';
import { sleep } from '#utils/async-utils';
import { RetryableError } from '../../cache/cache';
import { BaseLLM } from '../base-llm';
import { LLM, combinePrompts, logTextGeneration } from '../llm';

export const FIREWORKS_SERVICE = 'fireworks';

const client = new OpenAI({
	apiKey: process.env.FIREWORKS_KEY,
	baseURL: 'https://api.fireworks.ai/inference/v1',
});

/**
 * Together AI models
 */
export class FireworksLLM extends BaseLLM {
	@logTextGeneration
	async generateText(userPrompt: string, systemPrompt: string): Promise<string> {
		return withSpan('generateText', async (span) => {
			const prompt = combinePrompts(userPrompt, systemPrompt);

			if (systemPrompt) span.setAttribute('systemPrompt', systemPrompt);
			span.setAttributes({
				userPrompt,
				inputChars: prompt.length,
				model: this.model,
				caller: agentContext().callStack.at(-1) ?? '',
			});
			try {
				const response: OpenAI.ChatCompletion = await client.chat.completions.create({
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
					max_tokens: 4094,
				});

				const outputText = response.choices[0].message.content;

				const inputCost = this.getInputCostPerToken() * prompt.length;
				const outputCost = this.getOutputCostPerToken() * outputText.length;
				const cost = inputCost + outputCost;

				span.setAttributes({
					response: outputText,
					inputCost,
					outputCost,
					cost,
					outputChars: outputText.length,
				});

				addCost(cost);

				return outputText;
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

export function fireworksLlama3_70B(): LLM {
	return new FireworksLLM(FIREWORKS_SERVICE, 'accounts/fireworks/models/llama-v3-70b-instruct', 8000, 0.9 / 1_000_000, 0.9 / 1_000_000);
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
