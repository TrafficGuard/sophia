import fs from 'fs';
import path from 'path';
import { agentContext } from '#agent/agentContext';
import { func, funcClass } from '#functionSchema/functionDecorators';
import { envVar } from '#utils/env-var';

/**
 * A class to store files on the local file system
 */
@funcClass(__filename)
export class LocalFileStore {
	private basePath: string;

	constructor() {
		this.basePath = path.join(process.cwd(), '.nous', 'filestore');
	}

	/**
	 * Saves the contents to a file with the given filename.
	 * @param {string} filename - The name of the file to save.
	 * @param {string} contents - The contents to save to the file.
	 * @returns {Promise<void>}
	 */
	@func()
	async saveFile(filename: string, contents: string): Promise<void> {
		const agentId = agentContext()?.agentId ?? envVar('AGENT_ID');
		const fullPath = path.join(this.basePath, agentId, filename);
		await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
		await fs.promises.writeFile(fullPath, contents, 'utf8');
	}

	/**
	 * Retrieves the contents of a file.
	 * @param {string} filename - The name of the file to read.
	 * @returns {Promise<string>}
	 */
	@func()
	async getFile(filename: string): Promise<string> {
		const agentId = agentContext()?.agentId ?? envVar('AGENT_ID');
		const fullPath = path.join(this.basePath, agentId, filename);
		return await fs.promises.readFile(fullPath, 'utf8');
	}

	/**
	 * Lists all files in the current directory.
	 * @returns {Promise<string[]>}
	 */
	@func()
	async listFiles(): Promise<string[]> {
		const agentId = agentContext()?.agentId ?? envVar('AGENT_ID');
		const dirPath = path.join(this.basePath, agentId);
		await fs.promises.mkdir(dirPath, { recursive: true });
		const files = await fs.promises.readdir(dirPath);
		return files.filter((file) => fs.lstatSync(path.join(dirPath, file)).isFile());
	}
}
