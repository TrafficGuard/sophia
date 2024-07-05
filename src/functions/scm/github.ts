import { existsSync } from 'fs';
import path, { join } from 'path';
import { request } from '@octokit/request';
import { getFileSystem } from '#agent/agentContext';
import { SourceControlManagement } from '#functions/scm/sourceControlManagement';
import { logger } from '#o11y/logger';
import { functionConfig } from '#user/userService/userContext';
import { envVar } from '#utils/env-var';
import { checkExecResult, execCmd } from '#utils/exec';
import { func, funcClass } from '../../functionDefinition/functionDecorators';

type RequestType = typeof request;

export interface GitHubConfig {
	username: string;
	organisation: string;
	token: string;
}

/**
 * NOT COMPLETED OR TESTED!
 */
@funcClass(__filename)
export class GitHub implements SourceControlManagement {
	_request;
	_config: GitHubConfig;

	private config(): GitHubConfig {
		if (!this._config) {
			const userConfig = functionConfig(GitHub) as GitHubConfig;
			this._config = {
				username: userConfig.username || envVar('GITHUB_USER'),
				organisation: userConfig.organisation || envVar('GITHUB_ORG'),
				token: userConfig.token || envVar('GITHUB_TOKEN'),
			};
		}
		return this._config;
	}

	private request(): RequestType {
		if (!this.request) {
			functionConfig(GitHub).this._request = request.defaults({
				headers: {
					authorization: `token ${this.config().token}`,
				},
			});
		}
		return this._request;
	}

	/**
	 * Clones a GitHub project to the local filesystem
	 * @param projectPathWithOrg The repo to clone, in the format organisation/project
	 */
	@func()
	async cloneProject(projectPathWithOrg: string): Promise<string> {
		const paths = projectPathWithOrg.split('/');
		if (paths.length !== 2) throw new Error(`${projectPathWithOrg} must be in the format organisation/project`);
		const org = paths[0];
		const project = paths[1];

		const path = join(getFileSystem().basePath, '.nous', 'github', org, project);

		// TODO it cloned a project to the main branch when the default is master?
		// If the project already exists pull updates
		if (existsSync(path) && existsSync(join(path, '.git'))) {
			logger.info(`${org}/${project} exists at ${path}. Pulling updates`);
			// If we're resuming an agent which has already created the branch but not pushed
			// then it won't exist remotely, so this will return a non-zero code
			const result = await execCmd(`git -C ${path} pull`);
			// checkExecResult(result, `Failed to pull ${path}`);
		} else {
			logger.info(`Cloning project: ${org}/${project} to ${path}`);
			const command = `git clone https://oauth2:${this.config().token}@github.com/${projectPathWithOrg}.git ${path}`;
			const result = await execCmd(command);
			checkExecResult(result, `Failed to clone ${projectPathWithOrg}`);
		}
		return path;
	}

	@func()
	async createMergeRequest(title: string, description: string, sourceBranch: string, targetBranch: string): Promise<string> {
		// TODO git push

		const originUrl = (await execCmd('git config --get remote.origin.url')).stdout;
		const [owner, repo] = extractOwnerProject(originUrl);

		const response = await this.request()('POST /repos/{owner}/{repo}/pulls', {
			owner,
			repo,
			title: title,
			body: description,
			head: sourceBranch,
			base: targetBranch,
			headers: {
				'X-GitHub-Api-Version': '2022-11-28',
			},
		});
		return response.url;
	}

	@func()
	async getProjects(): Promise<GitHubRepository[]> {
		const response = await this.request()('GET /orgs/{org}/repos', {
			org: this.config().organisation,
			type: 'all',
			sort: 'updated',
			direction: 'desc',
			per_page: 100,
		});
		return response.data as GitHubRepository[];
	}

	getJobLogs(projectPath: string, jobId: string): Promise<string> {
		return Promise.resolve('');
	}
}

interface GitHubRepository {
	id: number;
	name: string;
	full_name: string;
	private: boolean;
	html_url: string;
	description: string | null;
	fork: boolean;
	created_at: string;
	updated_at: string;
	pushed_at: string;
	git_url: string;
	ssh_url: string;
	clone_url: string;
	default_branch: string;
}

function extractOwnerProject(url: string): [string, string] {
	// Remove trailing '.git' if present
	const cleanUrl = url.replace(/\.git$/, '');

	// Split the URL by '/' for HTTPS or ':' for SSH formats
	const parts = cleanUrl.split(/\/|:/);

	// The project name is the last part of the segments
	return [parts[parts.length - 2], parts[parts.length - 1]];
}
