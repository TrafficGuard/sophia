import { existsSync } from 'fs';
import { join } from 'path';
import { Gitlab, ProjectSchema } from '@gitbeaker/rest';
import { FileSystem } from '../../agent/filesystem';
import { func } from '../../agent/functions';
import { funcClass } from '../../agent/metadata';
import { getFileSystem } from '../../agent/workflows';
import { cacheRetry } from '../../cache/cache';
import { envVar } from '../../utils/env-var';
import { checkExecResult, execCmd, execCommand } from '../../utils/exec';
import { UtilFunctions } from '../util';
import { SourceControlManagement } from './sourceControlManagement';

export interface GitLabConfig {
	host: string;
	token: string;
	secretName?: string;
	secretProject?: string;
	topLevelGroups: string[];
	groupExcludes?: Set<string>;
}

const BATCH_SIZE = 5;

export type GitLabProject = Pick<
	ProjectSchema,
	| 'id'
	| 'name'
	| 'description'
	| 'path_with_namespace'
	| 'http_url_to_repo'
	| 'default_branch'
	| 'archived'
	// | "shared_with_groups"
	| 'visibility'
	| 'owner'
	| 'ci_config_path'
>;

@funcClass(__filename)
export class GitLabServer implements SourceControlManagement {
	api;
	config: GitLabConfig;

	constructor(config?: GitLabConfig) {
		this.config = config ?? {
			host: envVar('GITLAB_HOST'),
			token: envVar('GITLAB_TOKEN'),
			topLevelGroups: JSON.parse(envVar('GITLAB_GROUPS')),
		};
		this.api = new Gitlab({
			host: this.config.host,
			token: this.config.token,
		});
	}

	// /**
	//  * Searches the descriptions of all the projects in GitLab to find the project which has the files to edit to complete the requirements
	//  * @param requirements the task requirements
	//  * @returns the GitLab project details (name, git URL etc)
	//  */
	// async selectProject(requirements: string): Promise<GitLabProject> {
	// 	const projects = await this.getProjects();
	// 	const prompt = buildPrompt({
	// 		information: `The following is a list of our projects:\n<projects>${JSON.stringify(projects)}</projects>`,
	// 		requirements,
	// 		action:
	// 			'Select the project object which most closely matches the task and return the object. Output your answer in JSON format',
	// 	});
	//
	// 	const project = await getLlm().generateTextAsJson(prompt);
	// 	return project;
	// }

	/**
	 * @returns the details of all the projects available (name, description, git URL etc)
	 */
	@cacheRetry({ scope: 'global' })
	async getProjects(): Promise<any[]> {
		const resultProjects: GitLabProject[] = [];
		for (const group of this.config.topLevelGroups) {
			const projects = await this.api.Groups.allProjects(group, {
				orderBy: 'name',
				perPage: 100,
			});
			// console.log(`${group} ==========`);
			projects.sort((a, b) => a.path.localeCompare(b.path));
			projects.map((project) => this.toGitLabProject(project)).forEach((project) => resultProjects.push(project));

			const descendantGroups = await this.api.Groups.allDescendantGroups(group, {});
			for (const descendantGroup of descendantGroups) {
				if (descendantGroup.full_name.includes('Archive')) continue;
				if (this.config.groupExcludes?.has(descendantGroup.full_path)) continue;

				// console.log(`${descendantGroup.full_path} ==========`);
				const pageSize = 100;
				const projects = await this.api.Groups.allProjects(descendantGroup.id, {
					orderBy: 'name',
					perPage: 100,
				});
				if (projects.length >= pageSize) {
					throw new Error(`Need pagination for projects for group ${group}. Returned more than ${pageSize}`);
				}
				projects.sort((a, b) => a.path.localeCompare(b.path));
				projects.map((project) => this.toGitLabProject(project)).forEach((project) => resultProjects.push(project));
			}
		}

		return resultProjects;
	}

	private toGitLabProject(project: ProjectSchema): GitLabProject {
		return {
			id: project.id,
			name: project.name,
			description: project.description,
			path_with_namespace: project.path_with_namespace,
			http_url_to_repo: project.http_url_to_repo,
			default_branch: project.default_branch,
			archived: project.archived,
			visibility: project.visibility,
			owner: project.owner,
			ci_config_path: project.ci_config_path,
		};
	}

	/**
	 * Clones a project from GitLab to the file system. To use this project the function FileSystem.setWorkingDirectory must be called after with the returned value
	 * @param projectPathWithNamespace the full project path in GitLab
	 * @returns the path in the FileSystem containing the repository files
	 */
	@func
	async cloneProject(projectPathWithNamespace: string): Promise<string> {
		const path = join(getFileSystem().getWorkingDirectory(), 'gitlab', projectPathWithNamespace);

		// If the project already exists pull updates
		if (existsSync(path) && existsSync(join(path, '.git'))) {
			const result = await execCmd(`git -C ${path} pull`);
			checkExecResult(result, `Failed to pull unshallow ${path}`);
		} else {
			console.log(`Cloning to ${path}`);
			const command = `git clone https://oauth2:${this.config.token}@${this.config.host}/${projectPathWithNamespace}.git ${path}`;
			const result = await execCmd(command);
			checkExecResult(result, `Failed to clone ${projectPathWithNamespace}`);
		}
		return path;
	}

	@func
	async createMergeRequest(title: string, description: string): Promise<string> {
		// TODO lookup project details from project list
		// get main branch. If starts with feature and dev develop exists, then that
		const currentBranch = getFileSystem().vcs.getBranchName();

		const targetBranch = 'master'; // TODO get from the GitLab project

		const cmd = `git push --set-upstream origin "${currentBranch}" -o merge_request.create -o merge_request.target="${targetBranch}" -o merge_request.remove_source_branch -o merge_request.title="${title}"`;
		const { exitCode, stdout, stderr } = await execCommand(cmd);
		if (exitCode > 0) throw new Error(`${stdout}\n${stderr}`);

		const url = await new UtilFunctions().processText(stdout, 'Respond only with the URL where the merge request is.');
		if (!URL.canParse(url)) {
			throw new Error(`LLM did not extract MR url. Returned ${url}`);
		}
		return url;
	}
}
