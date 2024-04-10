import { writeFileSync } from 'fs';
import { join } from 'path';
import { func } from '../agent/functions';
import { funcClass } from '../agent/metadata';
import { getFileSystem, workflowContext } from '../agent/workflows';
import { execCommand } from '../utils/exec';

@funcClass(__filename)
export class CodeEditor {
	/**
	 * Makes the changes to the files to meet the task requirements
	 * @param requirements the task requirements
	 * @param filesToEdit the names of the relevant files to edit
	 */
	@func
	async editFilesToMeetRequirements(requirements: string, filesToEdit: string[]): Promise<void> {
		const messageFilePath = join(getFileSystem().getWorkingDirectory(), workflowContext.getStore().tempDir, 'aider-requirements');

		// TODO insert additional info into the prompt
		// We could have languageTools.getPrompt()
		// See if a project has a AI-code.md file
		// If we're writing tests have a prompt for test styles
		// etc

		writeFileSync(messageFilePath, requirements);
		const cmd = `aider --skip-check-update --yes --message-file="${messageFilePath}" ${filesToEdit.join(' ')}`;

		const { stdout, stderr, exitCode } = await execCommand(cmd);
		if (exitCode > 0) throw new Error(`${stdout} ${stderr}`);
	}
}
