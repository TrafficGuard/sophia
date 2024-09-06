import { addNote, agentContext, getFileSystem } from '#agent/agentContextLocalStorage';
import { func, funcClass } from '#functionSchema/functionDecorators';
import { GitProject } from '#functions/scm/gitProject';
import { GitLabProject } from '#functions/scm/gitlab';
import { getSourceControlManagementTool } from '#functions/scm/sourceControlManagement';
import { logger } from '#o11y/logger';
import { span } from '#o11y/trace';
import { createBranchName } from '#swe/createBranchName';
import { generatePullRequestTitleDescription } from '#swe/pullRequestTitleDescription';
import { selectProject } from '#swe/selectProject';
import { summariseRequirements } from '#swe/summariseRequirements';
import { ExecResult, execCommand, failOnError, runShellCommand } from '#utils/exec';
import { cacheRetry } from '../cache/cacheRetry';
import { CodeEditingAgent } from './codeEditingAgent';
import { ProjectInfo, detectProjectInfo } from './projectDetection';
import { basePrompt } from './prompt';

export function buildPrompt(args: {
	information: string;
	requirements: string;
	action: string;
}): string {
	return `${basePrompt}' + ${args.information}\n\nThe requirements of the task are as follows:\n<requirements>\n${args.requirements}\n</requirements>\n\nThe action to be performed is as follows:\n<action>\n${args.action}\n</action>\n`;
}

/**
 * Workflow for completing requirements. This will look up the appropriate project in source control, clone, make the changes and create a pull/merge request.
 * Assumes the SCM is set on the workflow context
 */
@funcClass(__filename)
export class SoftwareDeveloperAgent {
	/**
	 * Runs the software developer agent to complete the user request/requirements. This will find the appropriate Git project/repository, clone it, make the changes, compile and test if applicable, commit and create a pull/merge request to review.
	 * @param requirements the requirements to implement. Provide ALL the details that might be required by this agent to complete the requirements task. Do not refer to details in memory etc, you must provide the actual details.
	 * @returns the Merge/Pull request URL if one was created
	 */
	@func()
	async runSoftwareDeveloperWorkflow(requirements: string): Promise<string> {
		const fileSystem = getFileSystem();
		const requirementsSummary = await this.summariseRequirements(requirements);

		const gitProject = await this.selectProject(requirementsSummary);
		logger.info(`Selected project ${JSON.stringify(gitProject)}`);
		const targetBranch = gitProject.defaultBranch;

		const repoPath = await getSourceControlManagementTool().cloneProject(`${gitProject.namespace}/${gitProject.name}`);
		fileSystem.setWorkingDirectory(repoPath);

		const projectInfo = await this.detectSingleProjectInfo();

		if (projectInfo.initialise) {
			const result: ExecResult = await runShellCommand(projectInfo.initialise, { envVars: { NODE_ENV: 'development' } });
			failOnError('Error initialising the repository project', result);
		}

		// Should check we're on the develop/default branch first, and pull, when creating a branch
		// If we're resuming an agent which has progressed past here then it will switch to the branch it created before
		const branchName = await this.createBranchName(requirements);
		await fileSystem.vcs.switchToBranch(branchName);

		const initialHeadSha: string = await fileSystem.vcs.getHeadSha();

		try {
			await new CodeEditingAgent().runCodeEditWorkflow(requirementsSummary, projectInfo);
		} catch (e) {
			logger.warn(e.message);
			// If no changes were made then throw an error
			const currentHeadSha: string = await fileSystem.vcs.getHeadSha();
			if (initialHeadSha === currentHeadSha) {
				throw e;
			}
			// Otherwise swallow the exception so we can push the changes made so far for review
		}

		const { title, description } = await generatePullRequestTitleDescription(requirements, projectInfo.devBranch);

		return await getSourceControlManagementTool().createMergeRequest(title, description, branchName, targetBranch);
	}

	@cacheRetry({ scope: 'agent' })
	@span()
	async createBranchName(requirements: string, issueId?: string): Promise<string> {
		// We always want the agent to use the same branch name when its resumed/retrying, so we cache it in the agent scope
		return await createBranchName(requirements, issueId);
	}

	/**
	 * Summarises/re-writes the requirements in a clear, structured manner from the perspective of a software developer who needs is doing the implementation
	 * @param requirements the requirements to implement
	 */
	@cacheRetry()
	@span()
	async summariseRequirements(requirements: string): Promise<string> {
		return await summariseRequirements(requirements);
	}

	@cacheRetry({ scope: 'agent' })
	@span()
	async selectProject(requirements: string): Promise<GitProject> {
		return await selectProject(requirements);
	}

	// @cacheRetry()
	async detectProjectInfo(): Promise<ProjectInfo[]> {
		return await detectProjectInfo();
	}

	/**
	 * A projectInfo.json file may have references to sub-projects. Calling this method assumes
	 * there will be only one entry in the projectInfo.json file, and will throw an error if there is more
	 */
	async detectSingleProjectInfo(): Promise<ProjectInfo> {
		const projectInfos = await this.detectProjectInfo();
		if (projectInfos.length !== 1) throw new Error('detected project info length != 1');
		const projectInfo = projectInfos[0];
		logger.info(projectInfo, `Detected project info ${Object.keys(projectInfo).join(', ')}`);
		return projectInfo;
	}
}
