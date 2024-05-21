import axios, { AxiosInstance } from 'axios';
import { logger } from '#o11y/logger';
import { envVar } from '#utils/env-var';
import { cacheRetry } from '../cache/cacheRetry';
import { func } from '../functionDefinition/functions';
import { funcClass } from '../functionDefinition/metadata';

import { currentUser, toolConfig } from '#user/userService/userContext';

export interface JiraConfig {
	baseUrl: string;
	email: string;
	token: string;
}

@funcClass(__filename)
export class Jira {
	instance: AxiosInstance;

	constructor() {
		const config: JiraConfig = toolConfig(Jira) as JiraConfig;
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

	/**
	 * Gets the description of a JIRA issue
	 * @param {string} issueId the issue id (e.g XYZ-123)
	 * @returns {Promise<string>} the issue description
	 */
	@func()
	// @cacheRetry({ scope: 'global', ttlSeconds: 60 * 10 })
	async getJiraDescription(issueId: string): Promise<string> {
		try {
			// logger.info(`Getting jira description for issue ${issueId}`);
			const response = await this.instance.get(`issue/${issueId}`);
			return response.data.fields.description;
		} catch (error) {
			logger.error('Error fetching issue description:', error.message);
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
	// 		const response = await this.instance.get(`/issue/picker?query=${encodeURIComponent(query)}`);
	// 		return response.data.fields.description;
	// 	} catch (error) {
	// 		console.error('Error searching issues:', error);
	// 		throw error;
	// 	}
	// }
}
