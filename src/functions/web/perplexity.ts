import { logger } from '#o11y/logger';

import OpenAI from 'openai';
import { addCost, agentContext } from '#agent/agentContext';
import { functionConfig } from '#user/userService/userContext';
import { envVar } from '#utils/env-var';
import { cacheRetry } from '../../cache/cacheRetry';
import { func, funcClass } from '../../functionDefinition/functionDecorators';

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
				// TODO summarise long queries to a shorter id
				const key = `Perplexity-${researchQuery.replaceAll(' ', '_').replaceAll(/\W/g, '')}`;
				agentContext().memory[key] = content;
			}
			return content;
		} catch (e) {
			log.error(e, `query: ${researchQuery}`);
			throw e;
		}
	}
}
