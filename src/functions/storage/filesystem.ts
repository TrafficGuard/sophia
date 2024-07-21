import { readFileSync } from 'fs';
import { access, existsSync, lstat, lstatSync, mkdir, readFile, readdir, stat, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import path, { join } from 'path';
import { promisify } from 'util';
import ignore, { Ignore } from 'ignore';
import Pino from 'pino';
import { agentContext } from '#agent/agentContext';
import { func, funcClass } from '#functionSchema/functionDecorators';
import { parseArrayParameterValue } from '#functionSchema/functionUtils';
import { Git } from '#functions/scm/git';
import { VersionControlSystem } from '#functions/scm/versionControlSystem';
import { UtilFunctions } from '#functions/util';
import { logger } from '#o11y/logger';
import { spawnCommand } from '#utils/exec';
import { CDATA_END, CDATA_START } from '#utils/xml-utils';
import { needsCDATA } from '#utils/xml-utils';
const fs = {
	readFile: promisify(readFile),
	stat: promisify(stat),
	readdir: promisify(readdir),
	access: promisify(access),
	mkdir: promisify(mkdir),
	lstat: promisify(lstat),
};

import fg from 'fast-glob';
import { glob } from 'glob-gitignore';
const globAsync = promisify(glob);

type FileFilter = (filename: string) => boolean;

/**
 * Provides functions for LLMs to access the file system. Tools should generally use the functions as
 * - They are automatically included in OpenTelemetry tracing
 * - They use the working directory, so Nous can perform its actions outside the process running directory.
 *
 * The FileSystem is constructed with the basePath property which is like a virtual root.
 * Then the workingDirectory property is relative to the basePath.
 *
 * The functions which list/search filenames should return the paths relative to the workingDirectory.
 *
 * By default, the basePath is the current working directory of the process.
 */
@funcClass(__filename)
export class FileSystem {
	/** The path relative to the basePath */
	private _workingDirectory = './';
	vcs: VersionControlSystem | null = null;
	log: Pino.Logger;

	get workingDirectory(): string {
		return this._workingDirectory;
	}

	set workingDirectory(newName: string) {
		this._workingDirectory = newName;
	}
	/**
	 * @param basePath The root folder allowed to be accessed by this file system instance. This should only be accessed by system level
	 * functions. Generally getWorkingDirectory() should be used
	 */
	constructor(public basePath?: string) {
		this.basePath ??= process.cwd();
		const args = process.argv.slice(2); // Remove the first two elements (node and script path)
		const fsArg = args.find((arg) => arg.startsWith('--fs='));
		const fsEnvVar = process.env.NOUS_FS;
		if (fsArg) {
			const fsPath = fsArg.slice(4); // Extract the value after '-fs='
			if (existsSync(fsPath)) {
				this.basePath = fsPath;
			} else {
				logger.error(`Invalid -fs arg value. ${fsPath} does not exist`);
			}
		} else if (fsEnvVar) {
			if (existsSync(fsEnvVar)) {
				this.basePath = fsEnvVar;
			} else {
				logger.error(`Invalid NOUS_FS env var. ${fsEnvVar} does not exist`);
			}
		}

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
		if (this.workingDirectory.startsWith(this.basePath)) return this.workingDirectory;
		return path.join(this.basePath, this.workingDirectory);
	}

	/**
	 * Set the working directory, relative to the filesystem's basePath if starting with "/", otherwise relative to the current working directory.
	 * @param dir the new working directory
	 */
	@func()
	setWorkingDirectory(dir: string): void {
		if (!dir) throw new Error('workingDirectory must be provided');
		this.log.info(`setWorkingDirectory ${dir}`);
		if (`/${dir}`.startsWith(this.basePath)) dir = `/${dir}`;
		let newWorkingDirectory = dir.startsWith(this.basePath) ? dir.replace(this.basePath, '') : dir;
		newWorkingDirectory = dir.startsWith('/') ? newWorkingDirectory : path.join(this.workingDirectory, newWorkingDirectory);
		// Get the relative path from baseUrl to new working path
		const newFullWorkingDir = join(this.basePath, newWorkingDirectory);
		let relativePath = path.relative(this.basePath, newFullWorkingDir);
		// If the relative path starts with '..', new path is higher than basePath, so set it as the current dir
		if (relativePath.startsWith('..')) relativePath = './';
		this.log.debug(`  this.workingDirectory: ${relativePath}`);
		this.workingDirectory = relativePath;
	}

	/**
	 * Returns the file contents of all the files under the provided directory path
	 * @param dirPath the directory to return all the files contents under
	 * @returns the contents of the file(s) as a Map keyed by the file path
	 */
	async getFileContentsRecursively(dirPath: string): Promise<Map<string, string>> {
		const filenames = await this.listFilesRecursively(dirPath);
		return await this.readFiles(filenames);
	}

	/**
	 * Returns the file contents of all the files recursively under the provided directory path
	 * @param dirPath the directory to return all the files contents under
	 * @param storeToMemory if the file contents should be stored to memory. The key will be in the format file-contents-<FileSystem.workingDirectory>-<dirPath>
	 * @returns the contents of the file(s) in format <file_contents path="dir/file1">file1 contents</file_contents><file_contents path="dir/file2">file2 contents</file_contents>
	 */
	@func()
	async getFileContentsRecursivelyAsXml(dirPath: string, storeToMemory: boolean): Promise<string> {
		const filenames = await this.listFilesRecursively(dirPath);
		const contents = await this.readFilesAsXml(filenames);
		if (storeToMemory) agentContext().memory[`file-contents-${join(this.getWorkingDirectory(), dirPath)}`] = contents;
		return contents;
	}

	/**
	 * Searches for files on the filesystem (using ripgrep) with contents matching the search regex.
	 * @param contentsRegex the regular expression to search the content all the files recursively for
	 * @returns the list of filenames (with postfix :<match_count>) which have contents matching the regular expression.
	 */
	@func()
	async searchFilesMatchingContents(contentsRegex: string): Promise<string> {
		// --count Only show count of line matches for each file
		// const { stdout, stderr, exitCode } = await execCommand(`rg --count ${regex}`);
		const results = await spawnCommand(`rg --count ${arg(contentsRegex)}`);
		if (results.exitCode > 0) throw new Error(results.stderr);
		return results.stdout;
		// if (exitCode > 0) throw new Error(`${stdout}\n${stderr}`);
		// return stdout;
	}

	/**
	 * Searches for files on the filesystem where the filename matches the regex.
	 * @param fileNameRegex the regular expression to match the filename.
	 * @returns the list of filenames matching the regular expression.
	 */
	@func()
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
	@func()
	async listFilesInDirectory(dirPath = '.'): Promise<string[]> {
		const rootPath = path.join(this.basePath, dirPath);
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
	 * @param dirPath The directory to search under (Optional - defaults to the workingDirectory)
	 * @returns the list of files
	 */
	@func()
	async listFilesRecursively(dirPath = './'): Promise<string[]> {
		// const dirPath = './'
		if (dirPath !== './') throw new Error('listFilesRecursively needs to be fixed to work with the dirPath not being the workingDirectory');
		this.log.debug(`basePath: ${this.basePath}`);
		this.log.debug(`cwd: ${this.workingDirectory}`);
		this.log.debug(`cwd(): ${this.getWorkingDirectory()}`);

		const fullPath = path.join(this.getWorkingDirectory(), dirPath);
		// TODO check isnt going higher than this.basePath

		const filter: FileFilter = (name) => true;
		const ig = ignore();
		const gitIgnorePath = path.join(fullPath, '.gitignore');
		// console.log(gitIgnorePath);
		if (existsSync(gitIgnorePath)) {
			// read the gitignore file into a string array
			// console.log(`Found ${gitIgnorePath}`);
			let lines = await fs.readFile(gitIgnorePath, 'utf8').then((data) => data.split('\n'));
			lines = lines.map((line) => line.trim()).filter((line) => line.length && !line.startsWith('#'), filter);
			ig.add(lines);
			ig.add('.git');
		}

		const files: string[] = await this.listFilesRecurse(this.basePath, fullPath, ig);
		return files.map((file) => path.relative(this.getWorkingDirectory(), file));
	}

	async listFilesRecurse(rootPath: string, dirPath: string, ig, filter: (file: string) => boolean = (name) => true): Promise<string[]> {
		const relativeRoot = this.basePath;
		this.log.debug(`listFilesRecurse dirPath: ${dirPath}`);
		const files: string[] = [];

		const dirents = await fs.readdir(dirPath, { withFileTypes: true });
		for (const dirent of dirents) {
			if (dirent.isDirectory()) {
				const relativePath = path.relative(rootPath, path.join(dirPath, dirent.name));
				if (!ig.ignores(relativePath) && !ig.ignores(`${relativePath}/`)) {
					files.push(...(await this.listFilesRecurse(rootPath, path.join(dirPath, dirent.name), ig, filter)));
				}
			} else {
				const relativePath = path.relative(relativeRoot, path.join(dirPath, dirent.name));

				if (!ig.ignores(relativePath)) {
					// console.log(`pushing ${dirPath}/${dirent.name}`)
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
	@func()
	async readFile(filePath: string): Promise<string> {
		// TODO if the file doesn't exist search recursively for the filename, and if there is one result then return that
		logger.info(`getFileContents: ${filePath}`);
		// A filePath starts with / is it relative to FileSystem.basePath, otherwise its relative to FileSystem.workingDirectory
		const fullPath = filePath.startsWith('/') ? resolve(this.getWorkingDirectory(), filePath.slice(1)) : resolve(this.getWorkingDirectory(), filePath);

		// if (!existsSync(fullPath)) {
		// 	try {
		// 		const matches = await this.searchFilesMatchingName(filePath);
		// 		if (existsSync(matches)) {
		// 			fullPath = matches;
		// 		}
		// 	} catch (e) {
		// 		console.log(e);
		// 	}
		// }

		// const fullPath = path.join(this.basePath, filePath);
		logger.info(`Reading file ${fullPath}`);
		return await fs.readFile(fullPath, 'utf8');
	}

	/**
	 * Gets the contents of a local file on the file system and returns it in XML tags
	 * @param filePath The file path to read the contents of (e.g. src/index.ts)
	 * @returns the contents of the file(s) in format <file_contents path="dir/file1">file1 contents</file_contents>
	 */
	@func()
	async readFileAsXML(filePath: string): Promise<string> {
		return `<file_content file_path="${filePath}">\n${await this.readFile(filePath)}\n</file_contents>\n`;
	}

	/**
	 * Gets the contents of a list of local files, which must be relative to the current working directory
	 * @param filePaths {Array<string>} The files paths to read the contents
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
	 * @param filePaths {Array<string>} The files paths to read the contents of
	 * @returns {Promise<string>} the contents of the file(s) in format <file_contents path="dir/file1">file1 contents</file_contents><file_contents path="dir/file2">file2 contents</file_contents>
	 */
	@func()
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
	@func()
	async fileExists(filePath: string): Promise<boolean> {
		logger.info(`fileExists: ${filePath}`);
		// Check if we've been given an absolute path
		if (filePath.startsWith(this.basePath)) {
			try {
				logger.info(`fileExists: ${filePath}`);
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
	 * Writes to a file. If the file exists it will overwrite the contents.
	 * @param filePath The file path (either full filesystem path or relative to current working directory)
	 * @param contents The contents to write to the file
	 */
	// @func()
	async writeFile(filePath: string, contents: string): Promise<void> {
		const fileSystemPath = filePath.startsWith(this.basePath) ? filePath : join(this.getWorkingDirectory(), filePath);
		logger.info(`Writing file "${filePath}" to ${fileSystemPath}`);
		writeFileSync(fileSystemPath, contents);
	}

	/**
	 * Reads a file, then transforms the contents using a LLM to perform the described changes, then writes back to the file.
	 * @param filePath {string} The file to update
	 * @param descriptionOfChanges {string} A natual language description of the changes to make to the file contents
	 */
	@func()
	async editFileContents(filePath: string, descriptionOfChanges: string): Promise<void> {
		const contents = await this.readFile(filePath);
		const updatedContent = await new UtilFunctions().processText(contents, descriptionOfChanges);
		await this.writeFile(filePath, updatedContent);
	}

	private async loadGitignore(dirPath: string): Promise<Ignore> {
		const ig = ignore();
		const gitIgnorePath = path.join(dirPath, '.gitignore');
		if (existsSync(gitIgnorePath)) {
			let lines = await fs.readFile(gitIgnorePath, 'utf8').then((data) => data.split('\n'));
			lines = lines.map((line) => line.trim()).filter((line) => line.length && !line.startsWith('#'));
			ig.add(lines);
		}
		ig.add('.git');
		return ig;
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
	 * src/
	 *   utils/
	 *     helper.js
	 */
	@func()
	async getFileSystemTree(dirPath = './'): Promise<string> {
		const files = await this.listFilesRecursively(dirPath);
		const tree = new Map<string, string>();

		files.forEach((file) => {
			const parts = file.split(path.sep);
			let currentPath = '';
			parts.forEach((part, index) => {
				currentPath = path.join(currentPath, part);
				const indent = '  '.repeat(index);
				if (!tree.has(currentPath)) {
					tree.set(currentPath, `${indent}${part}${index < parts.length - 1 ? '/' : ''}\n`);
				}
			});
		});

		return Array.from(tree.values()).join('');
	}
}

/**
 * Sanitise arguments by single quoting and escaping single quotes in the value
 * @param arg command line argument value
 */
function arg(arg: string): string {
	return `'${arg.replace("'", "\\'")}'`;
}
