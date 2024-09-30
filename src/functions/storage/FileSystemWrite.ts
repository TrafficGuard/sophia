import { getFileSystem } from '#agent/agentContextLocalStorage';
import { func, funcClass } from '#functionSchema/functionDecorators';
import { LlmTools } from '#functions/util';

/**
 * Provides functions for LLMs to write to the file system
 */
@funcClass(__filename)
export class FileSystemWrite {
	/**
	 * Writes to a file. If the file exists it will overwrite the contents. This will create any parent directories required,
	 * @param filePath The file path (either full filesystem path or relative to current working directory)
	 * @param contents The contents to write to the file
	 * @param allowOverwrite if the filePath already exists, then it will overwrite or throw an error based on the allowOverwrite property
	 */
	@func()
	async writeFile(filePath: string, contents: string, allowOverwrite: boolean): Promise<void> {
		if ((await getFileSystem().fileExists(filePath)) && !allowOverwrite) throw new Error(`The file ${filePath} already exists`);
		await getFileSystem().writeFile(filePath, contents);
	}

	/**
	 * Reads a file, then transforms the contents using a LLM to perform the described changes, then writes back to the file.
	 * @param {string} filePath The file to update
	 * @param {string} descriptionOfChanges A natual language description of the changes to make to the file contents
	 */
	@func()
	async editFileContents(filePath: string, descriptionOfChanges: string): Promise<void> {
		const contents = await getFileSystem().readFile(filePath);
		const updatedContent = await new LlmTools().processText(contents, descriptionOfChanges);
		await this.writeFile(filePath, updatedContent, true);
	}
}
