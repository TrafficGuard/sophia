import { join } from 'path';
import { getFileSystem } from '#agent/agentContext';
import { execCommand } from '#utils/exec';
import { cacheRetry } from '../cache/cacheRetry';
import { func } from '../functionDefinition/functions';
import { funcClass } from '../functionDefinition/metadata';

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
		const cmd = `aider --skip-check-update --yes --message-file=${messageFilePath} ${filesToEdit.map((file) => `"${file}"`).join(' ')}`;

		const { stdout, stderr, exitCode } = await execCommand(cmd);
		if (exitCode > 0) throw new Error(`${stdout} ${stderr}`);
	}
}
