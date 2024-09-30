import { access, existsSync, lstat, mkdir, readFile, readdir, stat, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import path, { join } from 'path';
import { promisify } from 'util';
import { glob } from 'glob-gitignore';
import ignore, { Ignore } from 'ignore';
import Pino from 'pino';
import { agentContext } from '#agent/agentContextLocalStorage';
import { func, funcClass } from '#functionSchema/functionDecorators';
import { parseArrayParameterValue } from '#functionSchema/functionUtils';
import { Git } from '#functions/scm/git';
import { VersionControlSystem } from '#functions/scm/versionControlSystem';
import { LlmTools } from '#functions/util';
import { logger } from '#o11y/logger';
import { getActiveSpan } from '#o11y/trace';
import { spawnCommand } from '#utils/exec';
import { CDATA_END, CDATA_START, needsCDATA } from '#utils/xml-utils';
import { SOPHIA_FS } from '../../appVars';

const fs = {
	readFile: promisify(readFile),
	stat: promisify(stat),
	readdir: promisify(readdir),
	access: promisify(access),
	mkdir: promisify(mkdir),
	lstat: promisify(lstat),
};

// import fg from 'fast-glob';
const globAsync = promisify(glob);

type FileFilter = (filename: string) => boolean;

/**
 * Interface to the file system based for an Agent which maintains the state of the working directory.
 *
 * Provides functions for LLMs to access the file system. Tools should generally use the functions as
 * - They are automatically included in OpenTelemetry tracing
 * - They use the working directory, so Sophia can perform its actions outside the process running directory.
 *
 * The FileSystem is constructed with the basePath property which is like a virtual root.
 * Then the workingDirectory property is relative to the basePath.
 *
 * The functions which list/search filenames should return the paths relative to the workingDirectory.
 *
 * By default, the basePath is the current working directory of the process.
 */
export class FileSystemService {
	/** The filesystem path */
	private workingDirectory = '';
	vcs: VersionControlSystem | null = null;
	log: Pino.Logger;

	/**
	 * @param basePath The root folder allowed to be accessed by this file system instance. This should only be accessed by system level
	 * functions. Generally getWorkingDirectory() should be used
	 */
	constructor(public basePath?: string) {
		this.basePath ??= process.cwd();
		logger.info(`process.argv ${JSON.stringify(process.argv)}`);
		const args = process.argv; //.slice(2); // Remove the first two elements (node and script path)
		const fsArg = args.find((arg) => arg.startsWith('--fs='));
		const fsEnvVar = process.env[SOPHIA_FS];
		if (fsArg) {
			const fsPath = fsArg.slice(5); // Extract the value after '-fs='
			if (existsSync(fsPath)) {
				this.basePath = fsPath;
				logger.info(`Setting basePath to ${fsPath}`);
			} else {
				throw new Error(`Invalid -fs arg value. ${fsPath} does not exist`);
			}
		} else if (fsEnvVar) {
			if (existsSync(fsEnvVar)) {
				this.basePath = fsEnvVar;
			} else {
				throw new Error(`Invalid ${SOPHIA_FS} env var. ${fsEnvVar} does not exist`);
			}
		}
		this.workingDirectory = this.basePath;

		this.log = logger.child({ FileSystem: this.basePath });
		// We will want to re-visit this, the .git folder can be in a parent directory
		if (existsSync(path.join(this.basePath, '.git'))) {
			this.vcs = new Git(this);
		}
	}

	toJSON() {
		return {
			basePath: this.basePath,
			workingDirectory: this.workingDirectory,
		};
	}
	fromJSON(obj: any): this | null {
		if (!obj) return null;
		this.basePath = obj.basePath;
		this.workingDirectory = obj.workingDirectory;
		return this;
	}

	/**
	 * @returns the full path of the working directory on the filesystem
	 */
	getWorkingDirectory(): string {
		return this.workingDirectory;
	}

	/**
	 * Set the working directory. The dir argument may be an absolute filesystem path, otherwise relative to the current working directory.
	 * If the dir starts with / it will first be checked as an absolute directory, then as relative path to the working directory.
	 * @param dir the new working directory
	 */
	setWorkingDirectory(dir: string): void {
		if (!dir) throw new Error('dir must be provided');
		let relativeDir = dir;
		// Check absolute directory path
		if (dir.startsWith('/')) {
			if (existsSync(dir)) {
				this.workingDirectory = dir;
				this.log.info(`workingDirectory is now ${this.workingDirectory}`);
				return;
			}
			// try it as a relative path
			relativeDir = dir.substring(1);
		}
		const relativePath = path.join(this.getWorkingDirectory(), relativeDir);
		if (existsSync(relativePath)) {
			this.workingDirectory = relativePath;
			this.log.info(`workingDirectory is now ${this.workingDirectory}`);
			return;
		}

		throw new Error(`New working directory ${dir} does not exist (current working directory ${this.workingDirectory}`);
	}

	/**
	 * Returns the file contents of all the files under the provided directory path
	 * @param dirPath the directory to return all the files contents under
	 * @returns the contents of the file(s) as a Map keyed by the file path
	 */
	async getFileContentsRecursively(dirPath: string, useGitIgnore = true): Promise<Map<string, string>> {
		const filenames = await this.listFilesRecursively(dirPath, useGitIgnore);
		return await this.readFiles(filenames);
	}

	/**
	 * Returns the file contents of all the files recursively under the provided directory path
	 * @param dirPath the directory to return all the files contents under
	 * @param storeToMemory if the file contents should be stored to memory. The key will be in the format file-contents-<FileSystem.workingDirectory>-<dirPath>
	 * @returns the contents of the file(s) in format <file_contents path="dir/file1">file1 contents</file_contents><file_contents path="dir/file2">file2 contents</file_contents>
	 */
	async getFileContentsRecursivelyAsXml(dirPath: string, storeToMemory: boolean, filter: (path) => boolean = () => true): Promise<string> {
		const filenames = (await this.listFilesRecursively(dirPath)).filter(filter);
		const contents = await this.readFilesAsXml(filenames);
		if (storeToMemory) agentContext().memory[`file-contents-${join(this.getWorkingDirectory(), dirPath)}`] = contents;
		return contents;
	}

	/**
	 * Searches for files on the filesystem (using ripgrep) with contents matching the search regex.
	 * @param contentsRegex the regular expression to search the content all the files recursively for
	 * @returns the list of filenames (with postfix :<match_count>) which have contents matching the regular expression.
	 */
	async searchFilesMatchingContents(contentsRegex: string): Promise<string> {
		// --count Only show count of line matches for each file
		// rg likes this spawnCommand. Doesn't work it others execs
		const results = await spawnCommand(`rg --count ${arg(contentsRegex)}`);
		if (results.stderr.includes('command not found: rg')) {
			throw new Error('Command not found: rg. Install ripgrep');
		}
		if (results.exitCode > 0) throw new Error(results.stderr);
		return results.stdout;
	}

	/**
	 * Searches for files on the filesystem where the filename matches the regex.
	 * @param fileNameRegex the regular expression to match the filename.
	 * @returns the list of filenames matching the regular expression.
	 */
	async searchFilesMatchingName(fileNameRegex: string): Promise<string[]> {
		const regex = new RegExp(fileNameRegex);
		const files = await this.listFilesRecursively();
		return files.filter((file) => regex.test(file.substring(file.lastIndexOf(path.sep) + 1)));
	}

	/**
	 * Lists the file and folder names in a single directory.
	 * Folder names will end with a /
	 * @param dirPath the folder to list the files in. Defaults to the working directory
	 * @returns the list of file and folder names
	 */
	async listFilesInDirectory(dirPath = '.'): Promise<string[]> {
		// const rootPath = path.join(this.basePath, dirPath);
		const filter: FileFilter = (name) => true;
		const ig = ignore();
		// TODO should go up the directories to the base path looking for .gitignore files
		const gitIgnorePath = path.join(this.getWorkingDirectory(), dirPath, '.gitignore');
		// console.log(gitIgnorePath);
		if (existsSync(gitIgnorePath)) {
			// read the gitignore file into a string array
			// console.log(`Found ${gitIgnorePath}`);
			let lines = await fs.readFile(gitIgnorePath, 'utf8').then((data) => data.split('\n'));
			lines = lines.map((line) => line.trim()).filter((line) => line.length && !line.startsWith('#'), filter);
			ig.add(lines);
			ig.add('.git');
		}

		const files: string[] = [];

		const readdirPath = join(this.getWorkingDirectory(), dirPath);
		const dirents = await fs.readdir(readdirPath, { withFileTypes: true });
		for (const dirent of dirents) {
			const direntName = dirent.isDirectory() ? `${dirent.name}/` : dirent.name;
			const relativePath = path.relative(this.getWorkingDirectory(), path.join(this.getWorkingDirectory(), dirPath, direntName));

			if (!ig.ignores(relativePath)) {
				files.push(dirent.name);
			}
		}
		return files; //files.map((file) => file.substring(file.lastIndexOf(path.sep, file.length - 1)));
	}

	/**
	 * List all the files recursively under the given path, excluding any paths in a .gitignore file if it exists
	 * @param dirPath
	 * @returns the list of files
	 */
	async listFilesRecursively(dirPath = './', useGitIgnore = true): Promise<string[]> {
		this.log.debug(`cwd: ${this.workingDirectory}`);

		const startPath = path.join(this.getWorkingDirectory(), dirPath);
		// TODO check isnt going higher than this.basePath

		const ig = useGitIgnore ? await this.loadGitignoreRules(startPath) : ignore();

		const files: string[] = await this.listFilesRecurse(this.workingDirectory, startPath, ig, useGitIgnore);
		return files.map((file) => path.relative(this.workingDirectory, file));
	}

	async listFilesRecurse(
		rootPath: string,
		dirPath: string,
		parentIg: Ignore,
		useGitIgnore = true,
		filter: (file: string) => boolean = (name) => true,
	): Promise<string[]> {
		const relativeRoot = this.basePath;
		this.log.debug(`listFilesRecurse dirPath: ${dirPath}`);
		const files: string[] = [];

		const ig = useGitIgnore ? await this.loadGitignoreRules(dirPath) : ignore();
		const mergedIg = ignore().add(parentIg).add(ig);

		const dirents = await fs.readdir(dirPath, { withFileTypes: true });
		for (const dirent of dirents) {
			const relativePath = path.relative(rootPath, path.join(dirPath, dirent.name));
			if (dirent.isDirectory()) {
				if (!useGitIgnore || (!mergedIg.ignores(relativePath) && !mergedIg.ignores(`${relativePath}/`))) {
					files.push(...(await this.listFilesRecurse(rootPath, path.join(dirPath, dirent.name), mergedIg, useGitIgnore, filter)));
				}
			} else {
				if (!useGitIgnore || !mergedIg.ignores(relativePath)) {
					files.push(path.join(dirPath, dirent.name));
				}
			}
		}
		return files;
	}

	/**
	 * Gets the contents of a local file on the file system. If the user has only provided a filename you may need to find the full path using the searchFilesMatchingName function.
	 * @param filePath The file path to read the contents of (e.g. src/index.ts)
	 * @returns the contents of the file(s) in format <file_contents path="dir/file1">file1 contents</file_contents><file_contents path="dir/file2">file2 contents</file_contents>
	 */
	async readFile(filePath: string): Promise<string> {
		logger.debug(`readFile ${filePath}`);
		let contents: string;
		const relativeFullPath = path.join(this.getWorkingDirectory(), filePath);
		logger.debug(`Checking ${filePath} and ${relativeFullPath}`);
		// Check relative to current working directory first
		if (existsSync(relativeFullPath)) {
			contents = (await fs.readFile(relativeFullPath)).toString();
			// Then check if it's an absolute path
		} else if (filePath.startsWith('/') && existsSync(filePath)) {
			contents = (await fs.readFile(filePath)).toString();
		} else {
			throw new Error(`File ${filePath} does not exist`);
			// try {
			// 	const matches = await this.searchFilesMatchingName(filePath);
			//  if (matches.length === 1) {
			// 		fullPath = matches[0];
			// 	}
			// } catch (e) {
			// 	console.log(e);
			// }
		}

		getActiveSpan()?.setAttribute('size', contents.length);
		return contents;
	}

	/**
	 * Gets the contents of a local file on the file system and returns it in XML tags
	 * @param filePath The file path to read the contents of (e.g. src/index.ts)
	 * @returns the contents of the file(s) in format <file_contents path="dir/file1">file1 contents</file_contents>
	 */
	async readFileAsXML(filePath: string): Promise<string> {
		return `<file_content file_path="${filePath}">\n${await this.readFile(filePath)}\n</file_contents>\n`;
	}

	/**
	 * Gets the contents of a list of local files, which must be relative to the current working directory
	 * @param {Array<string>} filePaths The files paths to read the contents
	 * @returns {Promise<Map<string, string>>} the contents of the files in a Map object keyed by the file path
	 */
	async readFiles(filePaths: string[]): Promise<Map<string, string>> {
		const mapResult = new Map<string, string>();
		for (const relativeFilePath of filePaths) {
			const filePath = path.join(this.getWorkingDirectory(), relativeFilePath);
			try {
				const contents = await fs.readFile(filePath, 'utf8');
				mapResult.set(path.relative(this.getWorkingDirectory(), filePath), contents);
			} catch (e) {
				this.log.warn(`Error reading ${filePath} (${relativeFilePath}) ${e.message}`);
			}
		}
		return mapResult;
	}

	/**
	 * Gets the contents of a list of files, returning a formatted XML string of all file contents
	 * @param {Array<string>} filePaths The files paths to read the contents of
	 * @returns {Promise<string>} the contents of the file(s) in format <file_contents path="dir/file1">file1 contents</file_contents><file_contents path="dir/file2">file2 contents</file_contents>
	 */
	async readFilesAsXml(filePaths: string | string[]): Promise<string> {
		if (!Array.isArray(filePaths)) {
			filePaths = parseArrayParameterValue(filePaths);
		}
		const fileContents: Map<string, string> = await this.readFiles(filePaths);
		return this.formatFileContentsAsXml(fileContents);
	}

	formatFileContentsAsXml(fileContents: Map<string, string>): string {
		let result = '';

		fileContents.forEach((contents, path) => {
			const cdata = needsCDATA(contents);
			result += cdata
				? `<file_content file_path="${path}">${CDATA_START}\n${contents}\n${CDATA_END}</file_content>\n`
				: `<file_content file_path="${path}">\n${contents}\n</file_content>\n`;
		});
		return result;
	}

	/**
	 * Check if a file exists. A filePath starts with / is it relative to FileSystem.basePath, otherwise its relative to FileSystem.workingDirectory
	 * @param filePath The file path to check
	 * @returns true if the file exists, else false
	 */
	async fileExists(filePath: string): Promise<boolean> {
		// TODO remove the basePath checks. Either absolute or relative to this.cwd
		logger.debug(`fileExists: ${filePath}`);
		// Check if we've been given an absolute path
		if (filePath.startsWith(this.basePath)) {
			try {
				logger.debug(`fileExists: ${filePath}`);
				await fs.access(filePath);
				return true;
			} catch {}
		}
		// logger.info(`basePath ${this.basePath}`);
		// logger.info(`this.workingDirectory ${this.workingDirectory}`);
		// logger.info(`getWorkingDirectory() ${this.getWorkingDirectory()}`);
		const path = filePath.startsWith('/') ? resolve(this.basePath, filePath.slice(1)) : resolve(this.basePath, this.workingDirectory, filePath);
		try {
			// logger.info(`fileExists: ${path}`);
			await fs.access(path);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Writes to a file. If the file path already exists an Error will be thrown. This will create any parent directories required,
	 * @param filePath The file path (either full filesystem path or relative to current working directory)
	 * @param contents The contents to write to the file
	 */
	async writeNewFile(filePath: string, contents: string): Promise<void> {
		if (await this.fileExists(filePath)) throw new Error(`File ${filePath} already exists. Cannot overwrite`);
		await this.writeFile(filePath, contents);
	}

	/**
	 * Writes to a file. If the file exists it will overwrite the contents. This will create any parent directories required,
	 * @param filePath The file path (either full filesystem path or relative to current working directory)
	 * @param contents The contents to write to the file
	 */
	async writeFile(filePath: string, contents: string): Promise<void> {
		const fileSystemPath = filePath.startsWith(this.basePath) ? filePath : join(this.getWorkingDirectory(), filePath);
		logger.debug(`Writing file "${filePath}" to ${fileSystemPath}`);
		const parentPath = join(filePath, '..'); // what if we're in a root folder? unlikely
		await promisify(fs.mkdir)(parentPath, { recursive: true });
		writeFileSync(fileSystemPath, contents);
	}

	/**
	 * Reads a file, then transforms the contents using a LLM to perform the described changes, then writes back to the file.
	 * @param {string} filePath The file to update
	 * @param {string} descriptionOfChanges A natual language description of the changes to make to the file contents
	 */
	async editFileContents(filePath: string, descriptionOfChanges: string): Promise<void> {
		const contents = await this.readFile(filePath);
		const updatedContent = await new LlmTools().processText(contents, descriptionOfChanges);
		await this.writeFile(filePath, updatedContent);
	}

	async loadGitignoreRules(startPath: string): Promise<Ignore> {
		const ig = ignore();
		let currentPath = startPath;

		while (currentPath.startsWith(this.basePath)) {
			const gitIgnorePath = path.join(currentPath, '.gitignore');
			if (existsSync(gitIgnorePath)) {
				const lines = await fs.readFile(gitIgnorePath, 'utf8').then((data) =>
					data
						.split('\n')
						.map((line) => line.trim())
						.filter((line) => line.length && !line.startsWith('#')),
				);
				ig.add(lines);
			}
			currentPath = path.dirname(currentPath);
		}

		ig.add('.git');
		return ig;
	}

	async listFolders(dirPath = './'): Promise<string[]> {
		const workingDir = this.getWorkingDirectory();
		dirPath = path.join(workingDir, dirPath);
		try {
			const items = await fs.readdir(dirPath);
			const folders: string[] = [];

			for (const item of items) {
				const itemPath = path.join(dirPath, item);
				const stat = await fs.stat(itemPath);
				if (stat.isDirectory()) {
					const relativePath = path.relative(workingDir, itemPath);
					folders.push(relativePath);
				}
			}
			return folders;
		} catch (error) {
			console.error('Error reading directory:', error);
			return [];
		}
	}

	/**
	 * Recursively lists all folders under the given root directory.
	 * @param dir The root directory to start the search from. Defaults to the current working directory.
	 * @returns A promise that resolves to an array of folder paths relative to the working directory.
	 */
	async getAllFoldersRecursively(dir = './'): Promise<string[]> {
		const workingDir = this.getWorkingDirectory();
		const startPath = path.join(workingDir, dir);
		const ig = await this.loadGitignoreRules(startPath);

		const folders: string[] = [];

		const recurse = async (currentPath: string) => {
			const relativePath = path.relative(workingDir, currentPath);
			if (!relativePath || (!ig.ignores(relativePath) && !ig.ignores(`${relativePath}/`))) {
				folders.push(relativePath);

				const dirents = await fs.readdir(currentPath, { withFileTypes: true });
				for (const dirent of dirents) {
					if (dirent.isDirectory()) {
						const childPath = path.join(currentPath, dirent.name);
						await recurse(childPath);
					}
				}
			}
		};
		await recurse(startPath);
		// Remove the root directory from the list if it was included
		return folders.filter((folder) => folder !== '.');
	}

	/**
	 * Generates a textual representation of a directory tree structure.
	 *
	 * This function uses listFilesRecursively to get all files and directories,
	 * respecting .gitignore rules, and produces an indented string representation
	 * of the file system hierarchy.
	 *
	 * @param {string} dirPath - The path of the directory to generate the tree for, defaulting to working directory
	 * @returns {Promise<string>} A string representation of the directory tree.
	 *
	 * @example
	 * Assuming the following directory structure:
	 * ./
	 *  ├── file1.txt
	 *  ├── images/
	 *  │   ├── logo.png
	 *  └── src/
	 *      └── utils/
	 *          └── helper.js
	 *
	 * The output would be:
	 * file1.txt
	 * images/
	 *   logo.png
	 * src/utils/
	 *   helper.js
	 */
	async getFileSystemTree(dirPath = './'): Promise<string> {
		const files = await this.listFilesRecursively(dirPath);
		const tree = new Map<string, string>();

		files.forEach((file) => {
			const parts = file.split(path.sep);
			const isFile = !file.endsWith('/');
			const dirPath = isFile ? parts.slice(0, -1).join(path.sep) : file;
			const fileName = isFile ? parts[parts.length - 1] : '';

			if (!tree.has(dirPath)) {
				tree.set(dirPath, `${dirPath}${dirPath ? '/' : ''}\n`);
			}

			if (isFile) {
				const existingContent = tree.get(dirPath) || '';
				tree.set(dirPath, `${existingContent}  ${fileName}\n`);
			}
		});

		return Array.from(tree.values()).join('');
	}

	/**
	 * Returns the filesystem structure
	 * @param dirPath
	 * @returns a record with the keys as the folders paths, and the list values as the files in the folder
	 */
	async getFileSystemTreeStructure(dirPath = './'): Promise<Record<string, string[]>> {
		const files = await this.listFilesRecursively(dirPath);
		const tree: Record<string, string[]> = {};

		files.forEach((file) => {
			const parts = file.split(path.sep);
			const isFile = !file.endsWith('/');
			const dirPath = isFile ? parts.slice(0, -1).join(path.sep) : file;
			const fileName = isFile ? parts[parts.length - 1] : '';

			if (!tree[dirPath]) {
				tree[dirPath] = [];
			}

			if (isFile) {
				tree[dirPath].push(fileName);
			}
		});

		return tree;
	}
}

/**
 * Sanitise arguments by single quoting and escaping single quotes in the value
 * @param arg command line argument value
 */
function arg(arg: string): string {
	return `'${arg.replace("'", "\\'")}'`;
}
