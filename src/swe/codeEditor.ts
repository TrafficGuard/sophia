import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'node:child_process';
import fs, { readFile, unlinkSync } from 'node:fs';
import path, { join } from 'path';
import { promisify } from 'util';
import { addCost, agentContext, getFileSystem } from '#agent/agentContext';
import { func, funcClass } from '#functionSchema/functionDecorators';
import { LLM } from '#llm/llm';
import { Anthropic, Claude3_5_Sonnet } from '#llm/models/anthropic';
import { DeepseekLLM, deepseekCoder } from '#llm/models/deepseek';
import { GPT4o } from '#llm/models/openai';
import { logger } from '#o11y/logger';
import { getActiveSpan } from '#o11y/trace';
import { currentUser } from '#user/userService/userContext';
import { execCommand } from '#utils/exec';

@funcClass(__filename)
export class CodeEditor {
	/**
	 * Makes the changes to the project files to meet the task requirements
	 * @param requirements the complete task requirements with all the supporting documentation and code samples
	 * @param filesToEdit the names of any existing relevant files to edit
	 */
	@func()
	async editFilesToMeetRequirements(requirements: string, filesToEdit: string[]): Promise<void> {
		const span = getActiveSpan();
		const messageFilePath = '.aider-requirements';
		logger.debug(requirements);
		logger.debug(filesToEdit);
		// TODO insert additional info into the prompt
		// We could have languageTools.getPrompt()
		// See if a project has a AI-code.md file
		// or like https://aider.chat/docs/usage/conventions.html
		// If we're writing tests have a prompt for test styles
		await getFileSystem().writeFile(messageFilePath, requirements);
		// A blank entry was getting here which would cause Aider to error
		filesToEdit = filesToEdit.filter((file) => file?.trim().length);

		// https://aider.chat/docs/llms.html
		let env: any = undefined;
		let modelArg = '';
		const anthropicKey = currentUser().llmConfig.anthropicKey || process.env.ANTHROPIC_API_KEY;
		const deepSeekKey = currentUser().llmConfig.deepseekKey || process.env.DEEPSEEK_API_KEY;
		const openaiKey = currentUser().llmConfig.openaiKey || process.env.OPENAI_API_KEY;

		let llm: LLM;

		if (anthropicKey) {
			modelArg = '--sonnet';
			env = { ANTHROPIC_API_KEY: anthropicKey };
			span.setAttribute('model', 'sonnet');
			llm = Claude3_5_Sonnet();
		} else if (deepSeekKey) {
			modelArg = '--model deepseek/deepseek-coder';
			env = { DEEPSEEK_API_KEY: deepSeekKey };
			span.setAttribute('model', 'deepseek');
			llm = deepseekCoder();
		} else if (openaiKey) {
			// default to gpt4o
			modelArg = '';
			env = { OPENAI_API_KEY: openaiKey };
			span.setAttribute('model', 'openai');
			llm = GPT4o();
		} else {
			throw new Error('Aider code editing requires a key for Anthropic, Deepseek or OpenAI');
		}

		// User a folder in Nous process directory, not the FileSystem working directory
		// as we want all the 'system' files in one place.
		const llmHistoryFolder = join(process.cwd(), '.nous/aider/llm-history');
		await promisify(fs.mkdir)(llmHistoryFolder, { recursive: true });
		const llmHistoryFile = `${llmHistoryFolder}/${agentContext().agentId}-${Date.now()}`;

		try {
			writeFileSync(llmHistoryFile, '');
		} catch (e) {
			logger.error(e, 'Fatal Error reading/writing Aider llmH-history-file');
			const error = new Error(`Fatal Error reading/writing Aider llm-history-file. Error: ${e.message}`);
			if (e.stack) error.stack = e.stack;
			throw error;
		}

		// --map-tokens=2048
		// Use the Python from the Nous .python-version as it will have aider installed
		const cmd = `${getPythonPath()} -m aider --no-check-update --yes ${modelArg} --llm-history-file="${llmHistoryFile}" --message-file=${messageFilePath} ${filesToEdit
			.map((file) => `"${file}"`)
			.join(' ')}`;

		const { stdout, stderr, exitCode } = await execCommand(cmd, { envVars: env });
		if (stdout) logger.info(stdout);
		if (stderr) logger.error(stderr);

		// TODO parse  $0.12 session from the output

		try {
			const llmHistory = readFileSync(llmHistoryFile).toString();
			const parsedInput = this.parseAiderInput(llmHistory);
			const parsedOutput = this.parseAiderOutput(llmHistory);

			const costs = llm.calculateCost(parsedInput, parsedOutput);
			addCost(costs[0]);
			logger.debug(`Aider cost ${costs[0]}`);

			span.setAttributes({
				inputChars: parsedInput.length,
				outputChars: parsedOutput.length,
				cost: costs[0],
			});
			// unlinkSync(llmHistoryFile);
			// TODO should save them as LLMCalls
		} catch (e) {
			logger.error(e);
		}

		if (exitCode > 0) throw new Error(`${stdout} ${stderr}`);
	}

	private parseAiderInput(output: string): string {
		return output
			.split('\n')
			.filter((line) => line.startsWith('SYSTEM') || line.startsWith('USER'))
			.map((line) => line.replace(/^(SYSTEM|USER)\s/, ''))
			.join('\n');
	}

	private parseAiderOutput(output: string): string {
		return output
			.split('\n')
			.filter((line) => line.startsWith('ASSISTANT'))
			.map((line) => line.replace(/^ASSISTANT\s/, ''))
			.join('\n');
	}
}

export function getPythonPath() {
	// Read the Nous .python-version file
	const pythonVersionFile = path.join(process.cwd(), '.python-version');
	const pythonVersion = fs.readFileSync(pythonVersionFile, 'utf8').trim();
	// Use pyenv to find the path of the specified Python version
	return execSync(`pyenv prefix ${pythonVersion}`, { encoding: 'utf8' }).trim();
}
