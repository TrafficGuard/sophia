import { func } from '../functionDefinition/functions';
import { funcClass } from '../functionDefinition/metadata';

@funcClass(__filename)
export class GoogleCloud {
	/**
	 * Gets the logs from Google Cloud Logging
	 * @param filter The Cloud Logging filter to search
	 * @param dateFromIso The date/time to get the logs from
	 * @param dateToIso The date/time to get the logs to, or empty if upto now.
	 */
	@func()
	getCloudLoggingLogs(gcpProjectId: string, filter: string, dateFromIso: string, dateToIso: string): Promise<string> {
		return Promise.resolve('');
	}

	/**
	 * Query resource information by executing the gcloud command line tool. This must ONLY be used for querying information, and MUST NOT update or modify resources.
	 * @param gcloudCommand The gcloud query command to execute (
	 * @returns the console output if the exit code is 0, else throws the console output
	 */
	@func()
	executeGcloudCommandQuery(gcloudQueryCommand: string): Promise<string> {
		return Promise.resolve('');
	}

	/**
	 * Runs a gcloud command which make changes to cloud resources. The command will be validated by a human reviewer.
	 * @param gcloudCommand The gcloud command to execute
	 * @returns the console output if the exit code is 0, else throws the console output or human review rejection reason
	 */
	@func()
	executeGcloudCommandModification(gcloudQueryCommand: string): Promise<string> {
		return Promise.resolve('');
	}

	/**
	 * Returns the open alert incidents across all the production projects
	 * @returns {string[]} the open alert incidents
	 */
	@func()
	getOpenProductionIncidents(gcpProjectId: string): Promise<string[]> {
		return Promise.resolve([]);
	}
}
