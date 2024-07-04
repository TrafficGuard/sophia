import { getFileSystem } from '#agent/agentContext';
import { GitLabProject } from '#functions/scm/gitlab';
import { getSourceControlManagementTool } from '#functions/scm/sourceControlManagement';
import { logger } from '#o11y/logger';
import { span } from '#o11y/trace';
import { createBranchName } from '#swe/createBranchName';
import { generatePullRequestTitleDescription } from '#swe/pullRequestTitleDescription';
import { selectProject } from '#swe/selectProject';
import { summariseRequirements } from '#swe/summariseRequirements';
import { ExecResult, execCommand } from '#utils/exec';
import { cacheRetry } from '../cache/cacheRetry';
import { func, funcClass } from '../functionDefinition/functionDecorators';
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
	 * @param requirements the requirements to implement. Provide ALL the details that might be required by this agent to complete the requirements task.
	 */
	@func()
	async runSoftwareDeveloperWorkflow(requirements: string): Promise<void> {
		const requirementsSummary = await this.summariseRequirements(requirements);

		const gitProject = await this.selectProject(requirementsSummary);
		const targetBranch = gitProject.default_branch;

		const repoPath = await getSourceControlManagementTool().cloneProject(gitProject.path_with_namespace);
		// ensure we're setting a relative path. Not sure about this now that setWorkingDirectory will detect the basePath at the start of the path
		// if (repoPath.startsWith('/')) repoPath = repoPath.slice(1);
		getFileSystem().setWorkingDirectory(repoPath);

		const projectInfos = await this.detectProjectInfo();
		if (projectInfos.length !== 1) throw new Error('detected project info length != 1');
		const projectInfo = projectInfos[0];
		logger.info(projectInfo, `Detected project info ${Object.keys(projectInfo).join(', ')}`);

		if (projectInfo.initialise) {
			const result: ExecResult = await execCommand(projectInfo.initialise);
			if (result.exitCode > 0) throw new Error(`Error initialising the repository project: ${result.stdout} ${result.stderr}`);
		}

		// Should check we're on the develop branch first, and pull, when creating a branch
		// If we're resuming an agent which has progressed past here then it will switch to the branch it created before
		const branchName = await this.createBranchName(requirements);
		await getFileSystem().vcs.switchToBranch(branchName);

		await new CodeEditingAgent().runCodeEditWorkflow(requirementsSummary, projectInfo);

		const { title, description } = await generatePullRequestTitleDescription(requirements);

		await getSourceControlManagementTool().createMergeRequest(title, description, branchName, targetBranch);
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
	async selectProject(requirements: string): Promise<GitLabProject> {
		return await selectProject(requirements);
	}

	// @cacheRetry()
	async detectProjectInfo(): Promise<ProjectInfo[]> {
		return await detectProjectInfo();
	}
}
