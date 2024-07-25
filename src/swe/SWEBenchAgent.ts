import { getFileSystem, llms } from '#agent/agentContext';
import { func, funcClass } from '#functionSchema/functionDecorators';
import { Git } from '#functions/scm/git';
import { GitHub } from '#functions/scm/github';
import { GitLabProject } from '#functions/scm/gitlab';
import { SourceControlManagement, getSourceControlManagementTool } from '#functions/scm/sourceControlManagement';
import { UtilFunctions } from '#functions/util';
import { logger } from '#o11y/logger';
import { span } from '#o11y/trace';
import { ExecResult, ExecResults, execCmd, execCommand, runShellCommand } from '#utils/exec';
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

export interface SWEInstance {
	instance_id: string;
	text: string;
	repo: string;
	base_commit: string;
	problem_statement: string;
	hints_text: string;
	created_at: string;
	patch: string;
	test_patch: string;
	version: string;
	FAIL_TO_PASS: string;
	PASS_TO_PASS: string;
	environment_setup_commit: string;
}

/**
 * Workflow for completing requirements. This will look up the appropriate project in source control, clone, make the changes and create a pull/merge request.
 * Assumes the SCM is set on the workflow context
 */
@funcClass(__filename)
export class SWEBenchAgent {
	/**
	 * Runs the main workflow for implementing requirements. This will look up the appropriate project in GitLab, clone it, make the changes, compile and test if applicable, commit and create a pull/merge request to review.
	 * @param requirements the requirements for the changes.
	 */
	@func()
	async runInference(task: SWEInstance): Promise<void> {
		const repo = task.repo;

		// await new Git(getFileSystem()).clone(`https://www.github.com/${repo}`, task.environment_setup_commit);
		const path = await new GitHub().cloneProject(task.repo, task.environment_setup_commit);
		getFileSystem().setWorkingDirectory(path);
	}
}
