import { logger } from '#o11y/logger';

import OpenAI from 'openai';
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
	 */
	@cacheRetry()
	@func()
	async search(query: string): Promise<string> {
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
			return response.choices[0].message?.content;

			// $0.60/MIL + $5/1000
			// 5 / 1000
		} catch (e) {
			log.error(e, `query: ${query}`);
			throw e;
		}
	}
}
