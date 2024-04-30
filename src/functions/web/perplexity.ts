import { logger } from '#o11y/logger';

const sdk = require('api')('@pplx/v0#29jnn2rlt35the2');

import { func } from '#agent/functions';
import { funcClass } from '#agent/metadata';
import { cacheRetry } from '../../cache/cache';

const log = logger.child({ class: 'Perplexity' });

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
			const response = await sdk.post_chat_completions({
				model: 'sonar-medium-online',
				messages: [
					{ role: 'system', content: 'Be precise and concise.' },
					{ role: 'user', content: query },
				],
			});
			logger.debug(response);
			return response;
			// $0.60/MIL + $5/1000
			// 5 / 1000
		} catch (e) {
			log.error(e, `query: ${query}`);
			throw e;
		}
	}
}
