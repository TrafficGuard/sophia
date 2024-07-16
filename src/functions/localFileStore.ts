import * as fs from 'fs';
import * as path from 'path';
import { func, funcClass } from '../functionDefinition/functionDecorators';

/**
 * A class to store files on the local file system
 */
@funcClass(__filename)
export class LocalFileStore {
	/**
	 * Saves the contents to a file with the given filename.
	 * @param {string} filename - The name of the file to save.
	 * @param {string} contents - The contents to save to the file.
	 * @returns {Promise<void>}
	 */
	@func()
	async saveFile(filename: string, contents: string): Promise<void> {
		const fullPath = path.resolve(__dirname, filename);
		await fs.promises.writeFile(fullPath, contents, 'utf8');
	}

	/**
	 * Retrieves the contents of a file.
	 * @param {string} filename - The name of the file to read.
	 * @returns {Promise<string>}
	 */
	@func()
	async getFile(filename: string): Promise<string> {
		const fullPath = path.resolve(__dirname, filename);
		return await fs.promises.readFile(fullPath, 'utf8');
	}

	/**
	 * Lists all files in the current directory.
	 * @returns {Promise<string[]>}
	 */
	@func()
	async listFiles(): Promise<string[]> {
		const files = await fs.promises.readdir(__dirname);
		return files.filter((file) => fs.lstatSync(path.resolve(__dirname, file)).isFile());
	}
}
