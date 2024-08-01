import axios, { AxiosInstance } from 'axios';
import { func, funcClass } from '#functionSchema/functionDecorators';
import { logger } from '#o11y/logger';
import { functionConfig } from '#user/userService/userContext';
import { envVar } from '#utils/env-var';
import { cacheRetry } from '../cache/cacheRetry';

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
			const baseUrl = config.baseUrl || envVar('JIRA_BASE_URL');
			const email = config.email || envVar('JIRA_EMAIL');
			const apiToken = config.token || envVar('JIRA_API_TOKEN');

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
	 * @param {string} issueId - the issue id (e.g. XYZ-123)
	 * @returns {Promise<string>} the issue description
	 */
	@func()
	async getJiraDescription(issueId: string): Promise<string> {
		if (!issueId) throw new Error('issueId is required');
		try {
			const response = await this.axios().get(`issue/${issueId}`);
			// const fields = response.data.fields;

			// const summaru =
			// console.log(response.data)
			// console.log(response.data.fields.summary);
			// console.log('comments ============');
			// console.log(response.data.fields.comment.comments);
			// console.log('attachments ============');
			// console.log(response.data.fields.attachment);
			// /rest/api/3/attachment/content/{id}

			// for (const attachment of response.data.fields.attachment) {
			// 	// content.id;
			// 	// content.content;
			// 	// content.mimeType
			// 	try {
			// 		const attachmentResponse = await this.axios().get(attachment.content, { responseType: 'arraybuffer' });
			// 		const buffer = Buffer.from(attachmentResponse.data, 'binary');
			// 		writeFileSync('image.png', buffer);
			// 	} catch (e) {
			// 		logger.info(`Error getting attachment: ${e}`);
			// 	}
			// }

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
