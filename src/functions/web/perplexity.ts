import { logger } from '#o11y/logger';

import OpenAI from 'openai';
import { addCost, agentContext, llms } from '#agent/agentContextLocalStorage';
import { func, funcClass } from '#functionSchema/functionDecorators';
import { functionConfig } from '#user/userService/userContext';
import { envVar } from '#utils/env-var';
import { cacheRetry } from '../../cache/cacheRetry';

interface PerplexityResponse extends OpenAI.Chat.Completions.ChatCompletion {
	usage?: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}

const log = logger.child({ class: 'Perplexity' });

export interface PerplexityConfig {
	key: string;
}

@funcClass(__filename)
export class Perplexity {
	/**
	 * Calls Perplexity to perform online research.
	 * @param researchQuery the natural language query to research
	 * @param saveToMemory if the response should be saved to the agent memory.
	 * @returns {string} if saveToMemory is true then returns the memory key. If saveToMemory is false then returns the research contents.
	 */
	@cacheRetry()
	@func()
	async research(researchQuery: string, saveToMemory: boolean): Promise<string> {
		let response: PerplexityResponse | undefined;
		try {
			const perplexity = new OpenAI({
				apiKey: functionConfig(Perplexity).key ?? envVar('PERPLEXITY_KEY'),
				baseURL: 'https://api.perplexity.ai',
			});

			response = await perplexity.chat.completions.create({
				model: 'llama-3.1-sonar-large-128k-online',
				max_tokens: 4096,
				messages: [{ role: 'user', content: researchQuery }],
				stream: false,
			});
			const content = response.choices[0].message?.content;

			if (!content) {
				throw new Error('Perplexity API returned empty content');
			}

			// Cost calculation based on Perplexity API pricing (as of the last update)
			// Source: https://docs.perplexity.ai/docs/pricing
			if (response.usage) {
				const promptTokens = response.usage.prompt_tokens;
				const completionTokens = response.usage.completion_tokens;
				const totalTokens = response.usage.total_tokens;

				const costPerPromptToken = 0.000001; // $1 per million tokens
				const costPerCompletionToken = 0.000001; // $1 per million tokens
				const onlineCost = 0.005; // $5 per 1000 requests

				const cost = Number((promptTokens * costPerPromptToken + completionTokens * costPerCompletionToken + onlineCost).toFixed(6));
				addCost(cost);
			} else {
				log.warn('Usage information not available in Perplexity response');
			}

			if (saveToMemory) {
				const summary = await llms().easy.generateText(
					`<query>${researchQuery}</query>\nGenerate a summarised version of the research key in one short sentence at most, with only alphanumeric with underscores for spaces. Answer concisely with only the summary.`,
					null,
					{ id: 'summarisePerplexityQuery' },
				);
				const key = `Perplexity-${summary}`;
				agentContext().memory[key] = content;
				return key;
			}
			return content;
		} catch (e) {
			log.error(e, `Perplexity error. Query: ${researchQuery}. Usage: ${JSON.stringify(response?.usage)}`);
			throw e;
		}
	}
}
