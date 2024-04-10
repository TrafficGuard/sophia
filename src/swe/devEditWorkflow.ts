import path from 'path';
import { FileSystem } from '../agent/filesystem';
import { func } from '../agent/functions';
import { funcClass } from '../agent/metadata';
import { getFileSystem, llms } from '../agent/workflows';
import { cacheRetry } from '../cache/cache';
import { execCommand } from '../utils/exec';
import { CodeEditor } from './codeEditor';
import { ProjectInfo } from './projectDetection';
import { basePrompt } from './prompt';
import { selectFilesToEdit } from './selectFilesToEdit';
import { summariseRequirements } from './summariseRequirements';

export function buildPrompt(args: {
	information: string;
	requirements: string;
	action: string;
}): string {
	return `${basePrompt}\n${args.information}\n\nThe requirements of the task are as follows:\n<requirements>\n${args.requirements}\n</requirements>\n\nThe action to be performed is as follows:\n<action>\n${args.action}\n</action>\n`;
}

interface ErrorAnalysis {
	command: string;
	additionalFiles: string[];
	compileIssuesSummary: string;
}

@funcClass(__filename)
export class DevEditWorkflow {
	/**
	 * Runs a workflow which edits the code repository to implement the requirements, and committing changes to version control.
	 * It also compiles, formats, lints, and runs tests where applicable.
	 * @param requirements The requirements to implement.
	 * @param projectInfo details of the project, lang/runtime etc
	 */
	async runDevEditWorkflow(requirements: string, projectInfo: ProjectInfo) {
		const fileSystem: FileSystem = getFileSystem();
		const projectPath = path.join(fileSystem.getWorkingDirectory(), projectInfo.baseDir);
		fileSystem.setWorkingDirectory(projectInfo.baseDir);

		const initialSelectedFiles: string[] = await selectFilesToEdit(requirements);

		const updatedRequirements = `${requirements}\nSome of the requirements may have already been implemented, so don't duplicate any existing implementation meeting the requirements.`;

		console.log('projectPath', projectPath, '---------------------');
		console.log(initialSelectedFiles);

		let errorAnalysis: ErrorAnalysis = null;
		let compileErrorOutput = null;

		const MAX_ATTEMPTS = 5;
		let e: any;
		for (let i = 0; i < MAX_ATTEMPTS; i++) {
			try {
				const files: string[] = [...initialSelectedFiles];
				let editRequirements = updatedRequirements;

				if (errorAnalysis) editRequirements += `\nImmediate task: Fix the following compile errors:\n${compileErrorOutput}`;
				if (errorAnalysis?.additionalFiles) files.push(...errorAnalysis.additionalFiles);

				// Make sure the project compiles first
				if (i === 0) await this.compile(projectInfo);

				await new CodeEditor().editFilesToMeetRequirements(editRequirements, files);

				const newFiles: string[] = await fileSystem.vcs.getFilesAddedInHeadCommit();
				initialSelectedFiles.push(...newFiles);
				files.push(...newFiles);
				// TODO get any new files added in the last commit and add to initialSelectedFiles
				await this.compile(projectInfo);
				break;
			} catch (e) {
				if (i === MAX_ATTEMPTS - 1) {
					throw e;
				}
				// TODO If compiling fails after Aider edit, we could add in the diff from the files with compile errors
				compileErrorOutput = e.message;
				console.log('compileErrorOutput');
				console.log(compileErrorOutput);
				// TODO handle code editor error separately - what failure modes does it have (invalid args, git error etc)?
				errorAnalysis = await this.analyzeCompileErrors(e, projectPath, requirements, initialSelectedFiles);
			}
		}

		for (let i = 0; i < MAX_ATTEMPTS; i++) {
			try {
				// Run it twice so the first time can apply any auto-fixes, then the second time has only the non-auto fixable issues
				try {
					await this.runStaticAnalysis(projectInfo);
				} catch (e) {}
				await this.runStaticAnalysis(projectInfo);
				break;
			} catch (e) {
				if (i === MAX_ATTEMPTS - 1) {
					throw e;
				}

				// commit any successful changes
				await fileSystem.vcs.addAllTrackedAndCommit('Lint');

				compileErrorOutput = e.message;

				const staticErrorFiles = await this.extractFilenames(`${compileErrorOutput}\n\nExtract the filenames from the compile errors.`);

				await new CodeEditor().editFilesToMeetRequirements(`${compileErrorOutput}\nFix these static analysis errors`, staticErrorFiles);
			}
		}

		await this.testLoop(requirements, projectInfo, initialSelectedFiles, projectPath);
	}

	async analyzeCompileErrors(e: any, projectPath: string, requirements: string, initialFileSelection: string[]): Promise<ErrorAnalysis> {
		const fileContents = `<file_contents>\n${await getFileSystem().getMultipleFileContentsAsXml(initialFileSelection)}\n</file_contents>`;
		const fileList = `<project_filenames>\n${(await getFileSystem().listFilesRecursively()).join('\n')}\n</project_filenames>`;
		// if (e.stdout && e.stderr && e.cmd) {
		const compileOutputXml = `<compiler_output>\n${e.message}\n</compiler_output>`;
		const response = (await llms().hard.generateTextAsJson(
			buildPrompt({
				information: `${fileList}\n${fileContents}\n${compileOutputXml}`,
				action: `The compile errors above need to be analyzed to determine next steps fixing them.  The JSON will include a brief summary of the compile issues in the "compileIssuesSummary" property. It may include additional files to edit from the <compiler_output/>, which will be set on the "additionalFiles property". If the compile errors indicate one or more missing packages/modules, then a single command to install all the missing packages (e.g "npm install package1 package2") can be set on the "command" property.
Respond ONLY as JSON that MUST be in the format of this example:
<response_example>
<json>
{
   "command": "",
   "additionalFiles: [],
   "compileIssuesSummary": ""
}
</json>
</response_example>`,
				requirements,
			}),
		)) as ErrorAnalysis;
		if (response.command) {
			// TODO should make adding new package generic, maybe part of the LanguageTools interface
			if (!response.command.startsWith('npm ')) throw new Error(`Suspicious command ${response.command}`);
			const { exitCode, stdout, stderr } = await execCommand(response.command);
			if (exitCode > 0) {
				throw new Error(`Error running command ${response.command}. stdout: ${stdout}.\nstderr: ${stderr}`);
			}
		}
		return response;
	}

	async compile(projectInfo: ProjectInfo): Promise<void> {
		// Execute the command `npm run lint` with the working directory as projectPath using the standard node library and return the exit code, standard output and error output.
		// if (stat(projectRoots + '/' + projectPath).isDirectory()) {
		// 	console.log('Directory')
		// }
		console.log(getFileSystem().getWorkingDirectory(), projectInfo.compile);
		const { exitCode, stdout, stderr } = await execCommand(projectInfo.compile, getFileSystem().getWorkingDirectory());
		const result = `<compile_output><command>${projectInfo.compile}</command><stdout></stdout>${stdout}<stderr>${stderr}</stderr></compile_output>`;
		console.log('exit code', exitCode);
		console.log(stdout);
		console.error(result);
		if (exitCode > 0) {
			throw new Error(result);
		}
	}

	async runStaticAnalysis(projectInfo: ProjectInfo): Promise<void> {
		if (!projectInfo.staticAnalysis) return;
		const { exitCode, stdout, stderr } = await execCommand(projectInfo.staticAnalysis);
		const result = `<static_analysis_output><command>${projectInfo.compile}</command><stdout></stdout>${stdout}<stderr>${stderr}</stderr></static_analysis_output>`;
		if (exitCode > 0) {
			throw new Error(result);
		}
	}

	async runTests(projectInfo: ProjectInfo): Promise<void> {
		if (!projectInfo.test) return;
		const { exitCode, stdout, stderr } = await execCommand(projectInfo.test);
		const result = `<test_output><command>${projectInfo.test}</command><stdout></stdout>${stdout}<stderr>${stderr}</stderr></test_output>`;
		if (exitCode > 0) {
			throw new Error(result);
		}
	}

	async testLoop(requirements: string, projectInfo: ProjectInfo, initialSelectedFiles: string[], projectPath: string) {
		let testErrorOutput = null;
		let errorAnalysis: ErrorAnalysis = null;
		const MAX_ATTEMPTS = 5;
		for (let i = 0; i < MAX_ATTEMPTS; i++) {
			try {
				let testRequirements = `${requirements}\nSome of the requirements may have already been implemented, so don't duplicate any existing implementation meeting the requirements.\n`;
				testRequirements += 'Write any additional tests that would be of value.';
				await new CodeEditor().editFilesToMeetRequirements(testRequirements, initialSelectedFiles);
				await this.compile(projectInfo);
				await this.runTests(projectInfo);
				break;
			} catch (e) {
				if (i === MAX_ATTEMPTS - 1) {
					throw e;
				}
				testErrorOutput = e.message;
				console.log('testErrorOutput');
				console.log(testErrorOutput);
				errorAnalysis = await this.analyzeCompileErrors(e, projectPath, requirements, initialSelectedFiles);
			}
		}
	}

	@func
	@cacheRetry()
	async summariseRequirements(requirements: string): Promise<string> {
		return summariseRequirements(requirements);
	}

	@cacheRetry()
	async extractFilenames(summary: string): Promise<string[]> {
		const filenames = await getFileSystem().listFilesRecursively();
		const prompt = buildPrompt({
			information: `<project_files>\n${filenames.join('\n')}\n</project_files>`,
			requirements: summary,
			action:
				'You will respond ONLY in JSON. From the requirements quietly consider which the files may be required to complete the task. You MUST output your answer ONLY as JSON in the format of this example:\n<example>\n{\n files: ["file1", "file2", "file3"]\n}\n</example>',
		});
		const response = await llms().hard.generateTextAsJson(prompt);
		return response.files;
	}
}

async function reviewChanges(requirements: string): Promise<string> {
	const prompt = buildPrompt({
		information: `The following is the git diff of the changes made so far to meet the requirements:\n<diff>\n${await getFileSystem()
			.getVCS()
			.getDiff()}\n</diff>`,
		requirements,
		// action: 'Do the changes in the diff satisfy the requirements, and why or why not? Do the changes follow the same style as the rest of the code? Are any of the changes redundant?' +
		// 'If so explain why and finish with the output <complete/>. If not, detail what changes you would still like to make. Output your answer in the JSON matching this TypeScript interface:\n' +
		// '{\n requirementsMet: boolean\n requirementsMetReasoning: string\n sameStyle: boolean\n sameStyleReasoning: string\n redundant: boolean\n redundantReasoning: string\n}'
		action:
			'Do the changes in the diff satisfy the requirements, and explain why? Are there any redundant changes in the diff? Review the style of the code changes in the diff carefully against the original code.  Do the changes follow all of the style conventions of the original code, including preferring single/multi-line formatting, trailing characters etc? Explain why.\n' +
			'If there should be changes to the code to match the original style then output the updated diff with the fixes.',
	});

	return await llms().hard.generateText(prompt);
}
