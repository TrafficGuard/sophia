import axios, { AxiosInstance } from 'axios';
import { logger } from '#o11y/logger';
import { cacheRetry } from '../cache/cacheRetry';

import { func, funcClass } from '#functionSchema/functionDecorators';
import { functionConfig } from '#user/userService/userContext';

export interface JiraConfig {
	baseUrl: string;
	email: string;
	token: string;
}

@funcClass(__filename)
export class Jira {
	instance: AxiosInstance | undefined;

	private axios(): AxiosInstance {
		if (!this.instance) {
			const config: JiraConfig = functionConfig(Jira) as JiraConfig;
			const baseUrl = config.baseUrl;
			const email = config.email;
			const apiToken = config.token;

			this.instance = axios.create({
				baseURL: baseUrl,
				headers: {
					Authorization: `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`,
					'Content-Type': 'application/json ',
				},
			});
		}
		return this.instance;
	}

	/**
	 * Gets the description of a JIRA issue
	 * @param {string} issueId the issue id (e.g. XYZ-123)
	 * @returns {Promise<string>} the issue description
	 */
	@func()
	async getJiraDescription(issueId: string): Promise<string> {
		try {
			const response = await this.axios().get(`issue/${issueId}`);
			return response.data.fields.description;
		} catch (error) {
			logger.error(error, `Error fetching Jira ${issueId} description:`);
			throw error;
		}
	}

	// /**
	//  * Search JIRA issues
	//  * @param {string} query
	//  * @returns {Promise<string>} the serach results
	//  */
	// @func
	// @cacheRetry()
	// async search(query: string): Promise<string> {
	// 	try {
	// 		const response = await this.axios().get(`/issue/picker?query=${encodeURIComponent(query)}`);
	// 		return response.data.fields.description;
	// 	} catch (error) {
	// 		console.error('Error searching issues:', error);
	// 		throw error;
	// 	}
	// }
}
