import { logger } from '#o11y/logger';

import OpenAI from 'openai';
import { addCost, agentContext, llms } from '#agent/agentContext';
import { func, funcClass } from '#functionSchema/functionDecorators';
import { functionConfig } from '#user/userService/userContext';
import { envVar } from '#utils/env-var';
import { cacheRetry } from '../../cache/cacheRetry';

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
		try {
			const perplexity = new OpenAI({
				apiKey: functionConfig(Perplexity).key ?? envVar('PERPLEXITY_KEY'),
				baseURL: 'https://api.perplexity.ai',
			});

			const response = await perplexity.chat.completions.create({
				model: 'llama-3-sonar-large-32k-online',
				max_tokens: 4096,
				messages: [{ role: 'user', content: researchQuery }],
				stream: false,
			});
			const content = response.choices[0].message?.content;

			// https://docs.perplexity.ai/docs/pricing
			// $1/MIL output + $5/1000
			const tokens = content.length / 4; // llama 3
			const costPerToken = 1 / 1_000_000;
			const onlineCost = 5 / 1000;
			const cost = tokens * costPerToken + onlineCost;
			addCost(cost);

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
			log.error(e, `Perplexity error. Query: ${researchQuery}`);
			throw e;
		}
	}
}
