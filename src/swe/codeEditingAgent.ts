import path from 'path';
import { agentContext, getFileSystem, llms } from '#agent/agentContext';
import { func, funcClass } from '#functionSchema/functionDecorators';
import { FileSystem } from '#functions/storage/filesystem';
import { Perplexity } from '#functions/web/perplexity';
import { logger } from '#o11y/logger';
import { span } from '#o11y/trace';
import { CompileErrorAnalysis, CompileErrorAnalysisDetails, analyzeCompileErrors } from '#swe/analyzeCompileErrors';
import { reviewChanges } from '#swe/reviewChanges';
import { supportingInformation } from '#swe/supportingInformation';
import { execCommand } from '#utils/exec';
import { appContext } from '../app';
import { cacheRetry } from '../cache/cacheRetry';
import { CodeEditor } from './codeEditor';
import { ProjectInfo, detectProjectInfo } from './projectDetection';
import { basePrompt } from './prompt';
import { SelectFilesResponse, selectFilesToEdit } from './selectFilesToEdit';
import { summariseRequirements } from './summariseRequirements';

export function buildPrompt(args: {
	information: string;
	requirements: string;
	action: string;
}): string {
	return `${basePrompt}\n${args.information}\n\nThe requirements of the task are as follows:\n<requirements>\n${args.requirements}\n</requirements>\n\nThe action to be performed is as follows:\n<action>\n${args.action}\n</action>\n`;
}

@funcClass(__filename)
export class CodeEditingAgent {
	//* @param projectInfo details of the project, lang/runtime etc

	// No @param doc for projectInfo as its only for passing programmatically. We don't want the LLM hallucinating it
	/**
	 * Runs a workflow which edits the code repository to implement the requirements, and committing changes to version control.
	 * It also compiles, formats, lints, and runs tests where applicable.
	 * @param requirements The detailed requirements to implement, including supporting documentation and code samples. Do not refer to details in memory etc, you must provide the actual details.
	 */
	@func()
	async runCodeEditWorkflow(requirements: string, projectInfo?: ProjectInfo): Promise<CompileErrorAnalysis | null> {
		if (!projectInfo) {
			const detected: ProjectInfo[] = await detectProjectInfo();
			if (detected.length !== 1) throw new Error('projectInfo array must have one item');
			projectInfo = detected[0];
		}

		logger.info(projectInfo);
		const fs: FileSystem = getFileSystem();
		const git = fs.vcs;
		fs.setWorkingDirectory(projectInfo.baseDir);

		const headCommit = await fs.vcs.getHeadSha();
		const currentBranch = await fs.vcs.getBranchName();
		const gitSource = !projectInfo.devBranch || projectInfo.devBranch === currentBranch ? headCommit : projectInfo.devBranch;

		// Find the initial set of files required for editing
		const filesResponse: SelectFilesResponse = await this.selectFilesToEdit(requirements, projectInfo);
		const initialSelectedFiles: string[] = [
			...filesResponse.primaryFiles.map((selected) => selected.path),
			...filesResponse.secondaryFiles.map((selected) => selected.path),
		];
		logger.info(initialSelectedFiles, 'Initial selected files');

		// Perform a first pass on the files to generate an implementation specification
		const implementationDetailsPrompt = `${await fs.readFilesAsXml(initialSelectedFiles)}
		<requirements>${requirements}</requirements>
		You are a senior software engineer. Your task is to review the provided user requirements against the code provided and produce an implementation design specification to give to a developer to implement the changes in the provided files.
		Do not provide any details of verification commands etc as the CI/CD build will run integration tests. Only detail the changes required in the files for the pull request.
		Check if any of the requirements have already been correctly implemented in the code as to not duplicate work.
		Look at the existing style of the code when producing the requirements.
		`;
		const implementationRequirements = await llms().hard.generateText(implementationDetailsPrompt, null, { id: 'implementationSpecification' });

		// Edit/compile loop ----------------------------------------

		let compileErrorAnalysis: CompileErrorAnalysisDetails | null = null;
		let compileErrorSearchResults: string[] = [];
		let compileErrorSummaries: string[] = [];
		/* The git commit sha of the last commit which compiled successfully. We store this so when there are one or more commits
		   which don't compile, we can provide the diff since the last good commit to help identify causes of compile issues. */
		let compiledCommitSha: string | null = agentContext().memory.compiledCommitSha;

		const MAX_ATTEMPTS = 5;
		for (let i = 0; i < MAX_ATTEMPTS; i++) {
			try {
				// Make sure the project initially compiles
				if (i === 0) {
					await this.compile(projectInfo);
					const headSha = await git.getHeadSha();
					if (compiledCommitSha !== headSha) {
						const agent = agentContext();
						agent.memory.compiledCommitSha = headSha;
						await appContext().agentStateService.save(agent);
					}
				}

				const codeEditorFiles: string[] = [...initialSelectedFiles];
				// Start with the installed packages list and project conventions
				let codeEditorRequirements = await supportingInformation(projectInfo);

				// If the project doesn't compile or previous edit caused compile errors then we will create a requirements specifically for fixing any compile errors first before making more functionality changes
				if (compileErrorAnalysis) {
					const installPackages = compileErrorAnalysis.installPackages ?? [];
					for (const packageName of installPackages) await projectInfo.languageTools?.installPackage(packageName);

					let compileFixRequirements = '';
					if (compileErrorAnalysis.researchQuery) {
						try {
							const searchResult = await new Perplexity().research(compileErrorAnalysis.researchQuery, false);
							compileErrorSearchResults.push(searchResult);
						} catch (e) {
							logger.error(e, 'Error searching with Perplexity. Ensure you have configured a valid token');
						}
					}

					if (compileErrorSummaries.length) {
						compileFixRequirements += '<compile-error-history>\n';
						for (const summary of compileErrorSummaries) compileFixRequirements += '<compile-error-summary>${summary}</compile-error-summary>\n';
						compileFixRequirements += '</compile-error-history>\n';
					}
					compileFixRequirements += compileErrorSearchResults.map((result) => `<research>${result}</research>\n`).join();
					compileFixRequirements += `<compilerr-errors>${compileErrorAnalysis.compilerOutput}</compilerr-errors>\n\n`;
					if (compiledCommitSha) {
						compileFixRequirements += `<diff>${await git.getDiff(compiledCommitSha)}</diff>\n`;
						compileFixRequirements +=
							'The above diff has introduced compile errors. With the analysis of the compiler errors, first focus on analysing the diff for any obvious syntax and type errors and then analyse the files you are allowed to edit.\n';
					} else {
						compileFixRequirements +=
							'The project is not currently compiling. Analyse the compiler errors to identify the fixes required in the source code.\n';
					}
					if (compileErrorSummaries.length > 1) {
						compileFixRequirements +=
							'Your previous attempts have not fixed the compiler errors. A summary of the errors after previous attempts to fix have been provided.\n' +
							'If you are getting the same errors then try a different approach or provide a researchQuery to find the correct API usage.\n';
					}

					if (installPackages.length)
						compileFixRequirements += `The following packages have now been installed: ${installPackages.join(
							', ',
						)} which will fix any errors relating to these packages not being found.\n`;
					codeEditorRequirements = compileFixRequirements;

					codeEditorFiles.push(...(compileErrorAnalysis.additionalFiles ?? []));
				} else {
					// project is compiling, lets implement the requirements
					codeEditorRequirements += implementationRequirements;
					codeEditorRequirements += '\nOnly make changes directly related to these requirements.';
				}

				await new CodeEditor().editFilesToMeetRequirements(codeEditorRequirements, codeEditorFiles);

				// The code editor may add new files, so we want to add them to the initial file set
				const addedFiles: string[] = await git.getAddedFiles(compiledCommitSha);
				initialSelectedFiles.push(...addedFiles);

				// Check the changes compile
				await this.compile(projectInfo);

				// Update the compiled commit state
				compiledCommitSha = await git.getHeadSha();
				const agent = agentContext();
				agent.memory.compiledCommitSha = compiledCommitSha;
				await appContext().agentStateService.save(agent);
				compileErrorAnalysis = null;
				compileErrorSearchResults = [];
				compileErrorSummaries = [];

				break;
			} catch (e) {
				logger.info('Compiler error');
				logger.info(e);
				const compileErrorOutput = e.message;
				logger.error(`Compile Error Output: ${compileErrorOutput}`);
				// TODO handle code editor error separately - what failure modes does it have (invalid args, git error etc)?
				compileErrorAnalysis = await analyzeCompileErrors(compileErrorOutput, initialSelectedFiles, compileErrorSummaries);
				compileErrorSummaries.push(compileErrorAnalysis.compileIssuesSummary);
			}
		}

		if (compileErrorAnalysis) return compileErrorAnalysis;

		if (projectInfo.staticAnalysis) {
			const STATIC_ANALYSIS_MAX_ATTEMPTS = 2;
			for (let i = 0; i < STATIC_ANALYSIS_MAX_ATTEMPTS; i++) {
				// Run it twice so the first time can apply any auto-fixes, then the second time has only the non-auto fixable issues
				try {
					await this.runStaticAnalysis(projectInfo);
					await fs.vcs.mergeChangesIntoLatestCommit(initialSelectedFiles);
					break;
				} catch (e) {
					let staticAnalysisErrorOutput = e.message;
					// Merge any successful auto-fixes to the latest commit
					await fs.vcs.mergeChangesIntoLatestCommit(initialSelectedFiles);
					if (i === STATIC_ANALYSIS_MAX_ATTEMPTS - 1) {
						logger.warn(`Unable to fix static analysis errors: ${staticAnalysisErrorOutput}`);
					} else {
						staticAnalysisErrorOutput = e.message;
						logger.info(`Static analysis error output: ${staticAnalysisErrorOutput}`);
						const staticErrorFiles = await this.extractFilenames(`${staticAnalysisErrorOutput}\n\nExtract the filenames from the compile errors.`);

						await new CodeEditor().editFilesToMeetRequirements(
							`Static analysis command: ${projectInfo.staticAnalysis}\n${staticAnalysisErrorOutput}\nFix these static analysis errors`,
							staticErrorFiles,
						);
						// TODO need to compile again
					}
				}
			}
		}

		// Store in memory for now while we see how the prompt performs
		const branchName = await getFileSystem().vcs.getBranchName();
		agentContext().memory[`${branchName}--review`] = await this.reviewChanges(requirements, gitSource);

		// The prompts need some work
		// await this.testLoop(requirements, projectInfo, initialSelectedFiles);
	}

	async compile(projectInfo: ProjectInfo): Promise<void> {
		// Execute the command `npm run lint` with the working directory as projectPath using the standard node library and return the exit code, standard output and error output.
		// if (stat(projectRoots + '/' + projectPath).isDirectory()) {
		// 	console.log('Directory')
		// }
		logger.debug(getFileSystem().getWorkingDirectory(), projectInfo.compile);
		const { exitCode, stdout, stderr } = await execCommand(projectInfo.compile);
		const result = `<compile_output>
	<command>${projectInfo.compile}</command>
	<stdout>
	${stdout}
	</stdout>
	<stderr>
	${stderr}
	</stderr>
</compile_output>`;
		// console.log('exit code', exitCode);
		if (exitCode > 0) {
			logger.info(stdout);
			logger.error(stderr);
			throw new Error(result);
		}
	}

	@cacheRetry()
	async selectFilesToEdit(requirements: string, projectInfo: ProjectInfo): Promise<SelectFilesResponse> {
		return await selectFilesToEdit(requirements, projectInfo);
	}

	async runStaticAnalysis(projectInfo: ProjectInfo): Promise<void> {
		if (!projectInfo.staticAnalysis) return;
		const { exitCode, stdout, stderr } = await execCommand(projectInfo.staticAnalysis);
		const result = `<static_analysis_output><command>${projectInfo.compile}</command><stdout>${stdout}</stdout><stderr>${stderr}</stderr></static_analysis_output>`;
		if (exitCode > 0) {
			throw new Error(result);
		}
	}

	async runTests(projectInfo: ProjectInfo): Promise<void> {
		if (!projectInfo.test) return;
		const { exitCode, stdout, stderr } = await execCommand(projectInfo.test);
		const result = `<test_output><command>${projectInfo.test}</command><stdout>${stdout}</stdout><stderr>${stderr}</stderr></test_output>`;
		if (exitCode > 0) {
			throw new Error(result);
		}
	}

	//
	async testLoop(requirements: string, projectInfo: ProjectInfo, initialSelectedFiles: string[]): Promise<CompileErrorAnalysis | null> {
		if (!projectInfo.test) return null;
		let testErrorOutput = null;
		let errorAnalysis: CompileErrorAnalysis = null;
		const compileErrorHistory = [];
		const MAX_ATTEMPTS = 2;
		for (let i = 0; i < MAX_ATTEMPTS; i++) {
			try {
				let testRequirements = `${requirements}\nSome of the requirements may have already been implemented, so don't duplicate any existing implementation meeting the requirements.\n`;
				testRequirements += 'Write any additional tests that would be of value.';
				await new CodeEditor().editFilesToMeetRequirements(testRequirements, initialSelectedFiles);
				await this.compile(projectInfo);
				await this.runTests(projectInfo);
				errorAnalysis = null;
				break;
			} catch (e) {
				testErrorOutput = e.message;
				logger.info(`Test error output: ${testErrorOutput}`);
				errorAnalysis = await analyzeCompileErrors(testErrorOutput, initialSelectedFiles, compileErrorHistory);
			}
		}
		return errorAnalysis;
	}

	@cacheRetry({ scope: 'agent' })
	@span()
	async summariseRequirements(requirements: string): Promise<string> {
		return summariseRequirements(requirements);
	}

	@span()
	async reviewChanges(requirements: string, sourceBranchOrCommit: string): Promise<string> {
		return reviewChanges(requirements, sourceBranchOrCommit);
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
		const response: any = await llms().medium.generateJson(prompt, null, { id: 'extractFilenames' });
		return response.files;
	}
}
