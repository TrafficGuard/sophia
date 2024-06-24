import { getFileSystem, llms } from '#agent/agentContext';
import { GitLabProject } from '#functions/scm/gitlab';
import { SourceControlManagement, getSourceControlManagementTool } from '#functions/scm/sourceControlManagement';
import { UtilFunctions } from '#functions/util';
import { logger } from '#o11y/logger';
import { span } from '#o11y/trace';
import { ExecResult, ExecResults, execCmd, execCommand } from '#utils/exec';
import { cacheRetry } from '../cache/cacheRetry';
import { func } from '../functionDefinition/functions';
import { funcClass } from '../functionDefinition/metadata';
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
	 * Runs the main workflow for implementing requirements. This will look up the appropriate project in GitLab, clone it, make the changes, compile and test if applicable, commit and create a pull/merge request to review.
	 * @param requirements the requirements for the changes.
	 */
	@func()
	async runSoftwareDeveloperWorkflow(requirements: string): Promise<void> {
		const summary = await this.summariseRequirements(requirements);

		// console.log('Summary: ' + summary);
		const gitLabProject = await this.selectProject(summary);

		let repoPath = await getSourceControlManagementTool().cloneProject(gitLabProject.path_with_namespace);
		// ensure we're setting a relative path. Not sure about this now that setWorkingDirectory will detect the basePath at the start of the path
		if (repoPath.startsWith('/')) repoPath = repoPath.slice(1);
		getFileSystem().setWorkingDirectory(repoPath);
		const projectInfos = await this.detectProjectInfo();
		if (projectInfos.length !== 1) throw new Error('detected project info length != 1');

		const projectInfo = projectInfos[0];
		logger.info(projectInfo, `Detected project info ${Object.keys(projectInfo).join(', ')}`);

		if (projectInfo.initialise) {
			const result: ExecResult = await execCommand(projectInfo.initialise);
			if (result.exitCode > 0) throw new Error(`${result.stdout} ${result.stderr}`);
		}

		// Should check we're on the develop branch first, and pull, when creating a branch
		// If we're resuming an agent which has progressed past here then it will switch to the branch it created before
		const branchName = await this.createBranchName(requirements);
		await getFileSystem().vcs.switchToBranch(branchName);

		let error: any;
		try {
			await new CodeEditingAgent().runCodeEditWorkflow(`${requirements}\n\n${summary}`, projectInfo);
		} catch (e) {
			logger.error(e);
			error = e;
			throw e;
		}

		const mrDescription = await new UtilFunctions().processText(
			`<requirement>\n${requirements}\n</requirement><diff>\n${await getFileSystem().vcs.getBranchDiff()}\n</diff>`,
			'From these requirements and diff, generate a description for a Pull Request/Merge Request',
		);
		const mrTitle = await new UtilFunctions().processText(
			`<requirement>\n${requirements}\n</requirement><mr_description>\n${mrDescription}\n</mr_description>`,
			'From this Merge Request description, generate a title for the Merge Request',
		);
		await getSourceControlManagementTool().createMergeRequest(mrTitle, mrDescription);
	}

	@cacheRetry({ scope: 'agent' })
	@span()
	async createBranchName(requirements: string, issueId?: string): Promise<string> {
		// We always want the agent to use the same branch name when its resumed/retrying, so we cache it in the agent scope
		return llms().medium.generateTextWithResult(`<requirements>${requirements}</requirement>\n
		From the requirements generate a Git branch name (up to about 10 words/200 characters maximum) to make the changes on. Seperate words with dashes. Output your response in <result></result>`);
	}

	/**
	 * Summarises/re-writes the requirements in a clear, structured manner from the perspective of a software developer who needs is doing the implementation
	 * @param requirements the requirements to implement
	 */
	@cacheRetry()
	@span()
	async summariseRequirements(requirements: string): Promise<string> {
		const prompt = buildPrompt({
			information: '',
			requirements: `The following is the provided requirements of the task:\n<requirements>\n${requirements}\n</requirements>\n`,
			action: `Summarise the requirements into the actions that need to be taken from the perspective of a software developer who needs is doing the implementation. 
		This may include items such as:
		- Changes to business logic
		- Changes to configurations
		- Key details such as project Ids, file names, class names, resource names, configuration values etc.
		- Assumptions
		
		Do not provide implementation details, only a summary`,
		});
		return llms().hard.generateText(prompt);
	}

	@cacheRetry()
	@span()
	async selectProject(requirements: string): Promise<GitLabProject> {
		const scm: SourceControlManagement = getSourceControlManagementTool();
		const projects: any[] = await scm.getProjects();
		const prompt: string = buildPrompt({
			information: `The following is a list of our projects in our git server:\n${JSON.stringify(projects)}`,
			requirements,
			action:
				'You task is to only select the project object for the relevant repository which needs to cloned so we can later edit it to complete task requirements. Output your answer in JSON format and only output JSON',
		});

		return await llms().hard.generateTextAsJson(prompt);
	}

	// @cacheRetry()
	async detectProjectInfo(): Promise<ProjectInfo[]> {
		return detectProjectInfo();
	}
}

async function reviewChanges(projectPath: string, requirements: string) {
	const prompt = buildPrompt({
		information: `The following is the git diff of the changes made so far to meet the requirements:\n<diff>\n${await getFileSystem().vcs.getDiff()}\n</diff>`,
		requirements,
		// action: 'Do the changes in the diff satisfy the requirements, and why or why not? Do the changes follow the same style as the rest of the code? Are any of the changes redundant?' +
		// 'If so explain why and finish with the output <complete/>. If not, detail what changes you would still like to make. Output your answer in the JSON matching this TypeScript interface:\n' +
		// '{\n requirementsMet: boolean\n requirementsMetReasoning: string\n sameStyle: boolean\n sameStyleReasoning: string\n redundant: boolean\n redundantReasoning: string\n}'
		action:
			'Do the changes in the diff satisfy the requirements, and explain why? Are there any redundant changes in the diff? Review the style of the code changes in the diff carefully against the original code.  Do the changes follow all of the style conventions of the original code, including preferring single/multi-line formatting, trailing characters etc? Explain why.\n' +
			'If there should be changes to the code to match the original style then output the updated diff with the fixes.',
	});

	const response = await llms().hard.generateText(prompt);
}

export async function selectFiles(filenames: string[], summary: string): Promise<string[]> {
	const prompt = buildPrompt({
		information: `<project_files>\n${filenames.join('\n')}\n</project_files>`,
		requirements: summary,
		action:
			'From the requirements select the files which might be possibly required to complete the task. Output your answer in the JSON format:\n{\n files: ["file1", "file2", "file3"]\n}. Output only the JSON, nothing else.',
	});
	const response = await llms().medium.generateTextAsJson(prompt);
	return response.files;
}
