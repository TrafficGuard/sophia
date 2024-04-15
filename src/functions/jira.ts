import axios, { AxiosInstance } from 'axios';
import { func } from '#agent/functions';
import { funcClass } from '#agent/metadata';
import { envVar } from '#utils/env-var';
import { cacheRetry } from '../cache/cache';

@funcClass(__filename)
export class Jira {
	instance: AxiosInstance;

	constructor(baseUrl = envVar('JIRA_BASE_URL'), email = envVar('JIRA_EMAIL'), apiToken = envVar('JIRA_API_TOKEN')) {
		this.instance = axios.create({
			baseURL: baseUrl,
			headers: {
				Authorization: `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`,
				'Content-Type': 'application/json',
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
			const response = await this.instance.get(`/issue/${issueId}`);
			return response.data.fields.description;
		} catch (error) {
			console.error('Error fetching issue description:', error.message);
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
