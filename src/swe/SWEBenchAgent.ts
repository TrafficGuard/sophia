import { getFileSystem } from '#agent/agentContext';
import { func, funcClass } from '#functionSchema/functionDecorators';
import { GitHub } from '#functions/scm/github';
import { countTokens } from '#llm/tokens';
import { CodeEditingAgent } from '#swe/codeEditingAgent';
import { PythonTools } from '#swe/lang/python/pythonTools';
import { ProjectInfo } from '#swe/projectDetection';
import { selectFilesToEdit } from '#swe/selectFilesToEdit';
import { ExecResult, execCommand } from '#utils/exec';

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

interface VersionInstallation {
	python: string;
	packages?: string;
	install: string;
	pip_packages?: string;
	pre_install?: string[];
}

/**
 * Workflow for completing requirements. This will look up the appropriate project in source control, clone, make the changes and create a pull/merge request.
 * Assumes the SCM is set on the workflow context
 */
@funcClass(__filename)
export class SWEBenchAgent {
	private readonly MAX_CONTEXT_LENGTH = 16000;
	private readonly PROMPT_STYLE = 'style-3';

	@func()
	async runInference(task: SWEInstance): Promise<string> {
		// Setup
		const repo = task.repo;
		const path = await new GitHub().cloneProject(repo, task.environment_setup_commit);
		getFileSystem().setWorkingDirectory(path);

		// Environment setup
		await this.setupEnvironment(task);

		// Get README files
		const readmeFiles = await this.getReadmeFiles();

		// Get relevant file contents
		const relevantFiles = await this.getRelevantFiles(task.problem_statement, task.repo);

		// Prepare edit requirements
		const editRequirements = await this.prepareEditRequirements(task, readmeFiles, relevantFiles);

		await new CodeEditingAgent().runCodeEditWorkflow(editRequirements);
		const modelPatch: string = ''; // TODO diff between HEAD and task.base_commit/environment_setup_commit

		// Extract minimal patch
		const minimalPatch = this.extractMinimalPatch(modelPatch);

		// Run tests
		const testResults = await this.runTests(task);

		// Prepare output
		const output = {
			instance_id: task.instance_id,
			response: modelPatch,
			problem_statement: task.problem_statement,
			text_inputs: editRequirements,
			model_patch: modelPatch,
			minimal_patch: minimalPatch,
			test_results: testResults,
		};

		return JSON.stringify(output);
	}

	private async setupEnvironment(task: SWEInstance): Promise<void> {
		const installInstructions = this.getInstallInstructions(task.repo, task.version);
		const envName = task.repo.split('/')[1];

		// Create conda environment
		await execCommand(`conda create -n ${envName} python=${installInstructions.python} -y`);

		// Activate conda environment
		await execCommand(`conda activate ${envName}`);

		// Install packages
		if (installInstructions.packages) {
			if (installInstructions.packages === 'requirements.txt') {
				const reqContent = await this.getRequirements(task);
				await getFileSystem().writeFile('requirements.txt', reqContent);
				await execCommand('pip install -r requirements.txt');
			} else if (installInstructions.packages === 'environment.yml') {
				const envContent = await this.getEnvironmentYml(task);
				await getFileSystem().writeFile('environment.yml', envContent);
				await execCommand('conda env update -f environment.yml');
			} else {
				await execCommand(`conda install -y ${installInstructions.packages}`);
			}
		}

		// Install additional pip packages
		if (installInstructions.pip_packages) {
			await execCommand(`pip install ${installInstructions.pip_packages}`);
		}

		// Run pre-install commands
		if (installInstructions.pre_install) {
			for (const cmd of installInstructions.pre_install) {
				await execCommand(cmd);
			}
		}

		// Run install command
		await execCommand(installInstructions.install);
	}

	private getInstallInstructions(repo: string, version: string): VersionInstallation {
		// This would be a large mapping similar to MAP_VERSION_TO_INSTALL in the Python implementation
		// For brevity, we'll just return a default value here
		return {
			python: '3.9',
			packages: 'requirements.txt',
			install: 'pip install -e .',
		};
	}

	private async getRequirements(task: SWEInstance): Promise<string> {
		// This should implement logic similar to the get_requirements function in the Python scripts
		// For simplicity, we'll just read the requirements.txt file if it exists
		try {
			return await getFileSystem().readFile('requirements.txt');
		} catch (error) {
			console.warn('requirements.txt not found');
			return '';
		}
	}

	private async getEnvironmentYml(task: SWEInstance): Promise<string> {
		// This should implement logic similar to the get_environment_yml function in the Python scripts
		// For simplicity, we'll just read the environment.yml file if it exists
		try {
			return await getFileSystem().readFile('environment.yml');
		} catch (error) {
			console.warn('environment.yml not found');
			return '';
		}
	}

	private async getReadmeFiles(): Promise<string[]> {
		const files = await getFileSystem().listFilesRecursively();
		return files.filter((file) => file.toLowerCase().startsWith('readme'));
	}

	private async getRelevantFiles(problemStatement: string, repo: string): Promise<string[]> {
		const pythonProjectInfo: Partial<ProjectInfo> = {
			languageTools: new PythonTools(),
			language: 'python',
		};
		const files = await selectFilesToEdit(problemStatement, pythonProjectInfo as ProjectInfo);
		return [...files.primaryFiles.map((sf) => sf.path), ...files.secondaryFiles.map((sf) => sf.path)];
	}

	private async prepareEditRequirements(task: SWEInstance, readmeFiles: string[], relevantFiles: string[]): Promise<string> {
		let requirements = this.formatPrompt(task.problem_statement, this.PROMPT_STYLE);

		requirements += 'README contents:\n';
		for (const file of readmeFiles) {
			const content = await getFileSystem().readFile(file);
			requirements += `${file}:\n${content}\n\n`;
		}

		requirements += 'Relevant file contents:\n';
		let totalTokens = await countTokens(requirements);
		for (const file of relevantFiles) {
			const content = await getFileSystem().readFile(file);
			const fileContent = `${file}:\n${content}\n\n`;
			const fileTokens = await countTokens(fileContent);
			if (totalTokens + fileTokens <= this.MAX_CONTEXT_LENGTH) {
				requirements += fileContent;
				totalTokens += fileTokens;
			} else {
				break;
			}
		}

		return requirements;
	}

	private formatPrompt(problemStatement: string, style: string): string {
		// This should implement the prompt formatting logic similar to the Python implementation
		// For brevity, we'll just use a simple format here
		return `Problem statement: ${problemStatement}\n\nPlease provide a patch to resolve this issue.\n\n`;
	}

	private extractMinimalPatch(modelPatch: string): string {
		// This should implement the logic to extract the minimal patch from the model's output
		// For simplicity, we'll just return the model patch as is
		return modelPatch;
	}

	private async runTests(task: SWEInstance): Promise<string> {
		const testFramework = this.getTestFramework(task.repo);
		const failToPass = JSON.parse(task.FAIL_TO_PASS);
		const passToPass = JSON.parse(task.PASS_TO_PASS);

		let results = '';

		for (const test of failToPass) {
			const result = await execCommand(`${testFramework} ${test}`);
			results += `FAIL_TO_PASS ${test}: ${result.exitCode === 0 ? 'PASS' : 'FAIL'}\n`;
		}

		for (const test of passToPass) {
			const result = await execCommand(`${testFramework} ${test}`);
			results += `PASS_TO_PASS ${test}: ${result.exitCode === 0 ? 'PASS' : 'FAIL'}\n`;
		}

		return results;
	}

	private getTestFramework(repo: string): string {
		// This would be a mapping similar to MAP_REPO_TO_TEST_FRAMEWORK in the Python implementation
		// For simplicity, we'll just return a default value
		return 'pytest --no-header -rA --tb=no -p no:cacheprovider';
	}
}
