import { SourceControlManagement } from '#functions/scm/sourceControlManagement';
import { toolConfig } from '#user/userService/userContext';
import { envVar } from '#utils/env-var';
import { func } from '../../functionDefinition/functions';
import { funcClass } from '../../functionDefinition/metadata';

export interface GitHubConfig {
	token: string;
}

@funcClass(__filename)
export class GitHub implements SourceControlManagement {
	token;

	constructor() {
		this.token = toolConfig(GitHub).token ?? envVar('GITHUB_TOKEN');
	}

	@func()
	async cloneProject(projectPathWithNamespace: string): Promise<string> {
		return '';
	}

	@func()
	async createMergeRequest(title: string, description: string): Promise<string> {
		return '';
	}

	@func()
	async getProjects(): Promise<any[]> {
		return [];
	}

	async getJobLogs(projectPath: string, jobId: string): Promise<string> {
		throw new Error('Method not implemented.');
	}
}
