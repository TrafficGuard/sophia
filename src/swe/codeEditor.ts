import { join } from 'path';
import { getFileSystem } from '#agent/agentContext';
import { currentUser } from '#user/userService/userContext';
import { execCommand } from '#utils/exec';
import { cacheRetry } from '../cache/cacheRetry';
import { func, funcClass } from '../functionDefinition/functionDecorators';

@funcClass(__filename)
export class CodeEditor {
	/**
	 * Makes the changes to the project files to meet the task requirements
	 * @param requirements the complete task requirements with all the supporting documentation and code samples
	 * @param filesToEdit the names of any existing relevant files to edit
	 */
	@cacheRetry({ scope: 'global' })
	@func()
	async editFilesToMeetRequirements(requirements: string, filesToEdit: string[]): Promise<void> {
		const messageFilePath = '.aider-requirements';

		// TODO insert additional info into the prompt
		// We could have languageTools.getPrompt()
		// See if a project has a AI-code.md file
		// If we're writing tests have a prompt for test styles
		// etc
		await getFileSystem().writeFile(messageFilePath, requirements);
		// A blank entry was getting here which would cause Aider to error
		filesToEdit = filesToEdit.filter((file) => file?.trim().length);

		// https://aider.chat/docs/llms.html
		let env: any = undefined;
		let modelArg = '';
		const anthropicKey = currentUser().llmConfig.anthropicKey || process.env.ANTHROPIC_API_KEY;
		const deepSeekKey = currentUser().llmConfig.deepseekKey || process.env.DEEPSEEK_API_KEY;
		const openaiKey = currentUser().llmConfig.openaiKey || process.env.OPENAI_API_KEY;
		if (anthropicKey) {
			modelArg = '--sonnet';
			env = { ANTHROPIC_API_KEY: anthropicKey };
		} else if (deepSeekKey) {
			modelArg = '--model deepseek/deepseek-coder';
			env = { DEEPSEEK_API_KEY: deepSeekKey };
		} else if (openaiKey) {
			// default to gpt4o
			modelArg = '';
			env = { OPENAI_API_KEY: openaiKey };
		} else {
			throw new Error('Aider code editing requires a key for Anthropic, Deepseek or OpenAI');
		}

		// TODO --llm-history-file LLM_HISTORY_FILE
		// Then we can parse the tokens for an approximate cost

		const cmd = `aider --skip-check-update --yes ${modelArg} --message-file=${messageFilePath} ${filesToEdit.map((file) => `"${file}"`).join(' ')}`;

		const { stdout, stderr, exitCode } = await execCommand(cmd, { envVars: env });
		if (exitCode > 0) throw new Error(`${stdout} ${stderr}`);
	}
}
