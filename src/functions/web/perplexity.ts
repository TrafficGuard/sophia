import { logger } from '#o11y/logger';

import OpenAI from 'openai';
import { agentContext } from '#agent/agentContext';
import { currentUser, toolConfig } from '#user/userService/userContext';
import { envVar } from '#utils/env-var';
import { cacheRetry } from '../../cache/cacheRetry';
import { func } from '../../functionDefinition/functions';
import { funcClass } from '../../functionDefinition/metadata';

const log = logger.child({ class: 'Perplexity' });

export interface PerplexityConfig {
	key: string;
}

@funcClass(__filename)
export class Perplexity {
	/**
	 * Calls the Perplexity AI search API to provide an AI summarised query grounded with update-to-date web searches
	 * @param query the natural language query
	 * @param saveToMemory if the response should be saved to the agent memory.
	 */
	@cacheRetry()
	@func()
	async search(query: string, saveToMemory: boolean): Promise<string> {
		try {
			const perplexity = new OpenAI({
				apiKey: toolConfig(Perplexity).key ?? envVar('PERPLEXITY_KEY'),
				baseURL: 'https://api.perplexity.ai',
			});

			const response = await perplexity.chat.completions.create({
				model: 'llama-3-sonar-large-32k-online',
				max_tokens: 4096,
				messages: [{ role: 'user', content: query }],
				stream: false,
			});
			const content = response.choices[0].message?.content;
			// TODO Add perplexity costs. This is output tokens, do we get charged for their input tokens?
			// $0.60/MIL + $5/1000
			// 5 / 1000
			if (saveToMemory) {
				const key = `Perplexity-${query.replaceAll(' ', '_').replaceAll(/\W/g, '')}`;
				agentContext().memory[key] = content;
			}
			return content;
		} catch (e) {
			log.error(e, `query: ${query}`);
			throw e;
		}
	}
}
