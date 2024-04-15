import { agentContext, getFileSystem, llms } from '#agent/agentContext';
import { func } from '#agent/functions';
import { cacheRetry } from '../cache/cache';
import { GitLabProject } from '../functions/scm/gitlab';
import { UtilFunctions } from '../functions/util';
import { DevEditWorkflow } from './devEditWorkflow';
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
 * Workflow for completing requirements
 * Assumes the SCM is set on the workflow context
 */
export class DevRequirementsWorkflow {
	/**
	 * @param requirements the requirements for the changes.
	 */
	async runDevRequirementsWorkflow(requirements: string) {
		const summary = await this.summariseRequirements(requirements);

		// console.log('Summary: ' + summary);
		const gitLabProject = await this.selectProject(requirements);

		let repoPath = await agentContext.getStore().scm.cloneProject(gitLabProject.path_with_namespace);
		// ensure we're setting a relative path
		if (repoPath.startsWith('/')) repoPath = repoPath.slice(1);
		getFileSystem().setWorkingDirectory(repoPath);
		const projectInfos = await this.detectProjectInfo();

		if (projectInfos.length !== 1) throw new Error('detected project info length != 1');

		const projectInfo = projectInfos[0];

		await getFileSystem().vcs.createBranch('ABC-123-test');

		let error: any;
		try {
			await new DevEditWorkflow().runDevEditWorkflow(`${requirements}\n\n${summary}`, projectInfo);
		} catch (e) {
			error = e;
		}

		const mrDescription = await new UtilFunctions().processText(
			`<requirement>\n${requirements}\n</requirement><diff>\n${await getFileSystem().vcs.getBranchDiff()}\n</diff>`,
			'From these requirements and diff, generate a description for a Pull Request/Merge Request',
		);
		const mrTitle = await new UtilFunctions().processText(
			`<requirement>\n${requirements}\n</requirement><mr_description>\n${mrDescription}\n</mr_description>`,
			'From this Merge Request description, generate a title for the Merge Request',
		);
		await agentContext.getStore().scm?.createMergeRequest(mrTitle, mrDescription);

		// TODO notify who started the workflow
	}

	@cacheRetry()
	@func()
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
	async selectProject(requirements: string): Promise<GitLabProject> {
		const projects = await agentContext.getStore().scm.getProjects();
		const prompt = buildPrompt({
			information: `The following is a list of our projects:\n${JSON.stringify(projects)}`,
			requirements,
			action: 'Select the project object which most closely matches the task and return the object. Output your answer in JSON format',
		});

		return await llms().medium.generateTextAsJson(prompt);
	}

	@cacheRetry()
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
			'From the requirements select the files which might be possibly required to complete the task. Output your answer in the JSON format:\n{\n files: ["file1", "file2", "file3"]\n}',
	});
	const response = await llms().medium.generateTextAsJson(prompt);
	return response.files;
}
