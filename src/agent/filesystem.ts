import { access, existsSync, readFile, readdir, stat, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import path, { join } from 'path';
import { promisify } from 'util';
import ignore from 'ignore';
import Pino from 'pino';
import { logger } from '#o11y/logger';
import { execCommand } from '#utils/exec';
import { CDATA_END, CDATA_START } from '#utils/xml-utils';
import { needsCDATA } from '#utils/xml-utils';
import { Git } from '../functions/scm/git';
import { VersionControlSystem } from '../functions/scm/versionControlSystem';
import { UtilFunctions } from '../functions/util';
import { func, parseArrayParameterValue } from './functions';
import { funcClass } from './metadata';
const fs = {
	readFile: promisify(readFile),
	stat: promisify(stat),
	readdir: promisify(readdir),
	access: promisify(access),
};

type FileFilter = (filename: string) => boolean;
@funcClass(__filename)
export class FileSystem {
	/** The path relative to the basePath */
	private workingDirectory = '.';
	vcs: VersionControlSystem | null = null;
	log: Pino.Logger;

	/**
	 * @param basePath The root folder allowed to be accessed by this file system instance. This should only be accessed by system level
	 * functions. Generally getWorkingDirectory() should be used
	 */
	constructor(public basePath: string = process.cwd()) {
		this.log = logger.child({ FileSystem: basePath });
		// We will want to re-visit this, the .git folder can be in a parent directory
		if (existsSync(path.join(basePath, '.git'))) {
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
	 * Set the working directory, relative to the basePath if starting with /, else relative to the current working directory.
	 * @param dir the new working directory
	 */
	setWorkingDirectory(dir: string): void {
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
	 * Gets the version control system (e.g. Git) commands for this filesystem if its under version control, else null.
	 */
	getVCS(): VersionControlSystem | null {
		return null;
	}

	/**
	 * Returns the file contents of all the files under the provided directory path
	 * @param dirPath the directory to return all the files contents under
	 * @returns the contents of the file(s) as a Map keyed by the file path
	 */
	async getFileContentsRecursively(dirPath: string): Promise<Map<string, string>> {
		const filenames = await this.listFilesRecursively(dirPath);
		return await this.getMultipleFileContents(filenames);
	}

	/**
	 * Returns the file contents of all the files recursively under the provided directory path
	 * @param dirPath the directory to return all the files contents under
	 * @returns the contents of the file(s) in format <file_contents path="dir/file1">file1 contents</file_contents><file_contents path="dir/file2">file2 contents</file_contents>
	 */
	@func()
	async getFileContentsRecursivelyAsXml(dirPath: string): Promise<string> {
		const filenames = await this.listFilesRecursively(dirPath);
		return await this.getMultipleFileContentsAsXml(filenames);
	}

	/**
	 * Searches for files on the filesystem (using ripgrep) with contents matching the search regex.
	 * @param regex the regular expression to search in all the files recursively for
	 * @returns the list of filenames (with postfix :<match_count>) which have contents matching the regular expression.
	 */
	@func()
	async searchFiles(regex: string): Promise<string> {
		// --count Only show count of line matches for each file
		const { stdout, stderr, exitCode } = await execCommand(`ripgrep --count ${regex}`);
		if (exitCode > 0) throw new Error(`${stdout}\n${stderr}`);
		return stdout;
	}

	/**
	 * Lists the file and folder names in a single directory (the current directory.
	 * Folder names will end with a /
	 * @param dirPath the folder to list the files in
	 * @returns the list of file and folder names
	 */
	@func()
	async listFilesInDirectory(dirPath: string): Promise<string[]> {
		const rootPath = path.join(this.basePath, dirPath);
		const filter: FileFilter = (name) => true;
		const ig = ignore();
		const gitIgnorePath = path.join(this.basePath, dirPath, '.gitignore');
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

		const dirents = await fs.readdir(dirPath, { withFileTypes: true });
		for (const dirent of dirents) {
			const direntName = dirent.isDirectory() ? `${dirent.name}/` : dirent.name;
			const relativePath = path.relative(this.basePath, path.join(dirPath, direntName));

			if (!ig.ignores(relativePath)) {
				files.push(path.join(dirPath, dirent.name));
			}
		}
		return files.map((file) => file.replace(`${this.basePath}/`, ''));
	}

	/**
	 * List all the files recursively under the given path, excluding any paths in a .gitignore file if it exists
	 * @param dirPath The directory to search under (Optional - defaults to the workingDirectory)
	 * @returns the list of files
	 */
	@func()
	async listFilesRecursively(dirPath = './'): Promise<string[]> {
		// dirPath ??= getFileSystem().workingDirectory
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
		const result = files.map((file) => {
			return path.normalize(file.replace(`${this.basePath}/`, ''));
		});
		return result;
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
	 * Gets the contents of a local file on the file system.
	 * @param filePath The file path to read the contents of (e.g. src/index.ts)
	 * @returns the contents of the file(s) in format <file_contents path="dir/file1">file1 contents</file_contents><file_contents path="dir/file2">file2 contents</file_contents>
	 */
	@func()
	async getFileContents(filePath: string): Promise<string> {
		// A filePath starts with / is it relative to FileSystem.basePath, otherwise its relative to FileSystem.workingDirectory
		const fullPath = filePath.startsWith('/') ? resolve(this.basePath, filePath.slice(1)) : resolve(this.basePath, this.workingDirectory, filePath);
		// const fullPath = path.join(this.basePath, filePath);
		return fs.readFile(fullPath, 'utf8');
	}

	/**
	 * Gets the contents of a local file on the file system.
	 * @param filePath The file path to read the contents of (e.g. src/index.ts)
	 * @returns the contents of the file(s) in format <file_contents path="dir/file1">file1 contents</file_contents><file_contents path="dir/file2">file2 contents</file_contents>
	 */
	@func()
	async getFileContentsAsXML(filePath: string): Promise<string> {
		return `<file_content file_path="${filePath}">\n${await this.getFileContents(filePath)}\n</file_contents>\n`;
	}

	/**
	 * Gets the contents of a list of local files.
	 * @param filePaths {Array<string>} The files paths to read the contents of
	 * @returns {Promise<Map<string, string>>} the contents of the files in a Map object keyed by the file path
	 */
	async getMultipleFileContents(filePaths: string[]): Promise<Map<string, string>> {
		const mapResult = new Map<string, string>();
		for (let projectFilePath of filePaths) {
			if (projectFilePath.startsWith('/')) projectFilePath = projectFilePath.slice(1);
			const filePath = path.join(this.basePath, projectFilePath);
			try {
				const contents = await fs.readFile(filePath, 'utf8');
				mapResult.set(projectFilePath, contents);
			} catch (e) {
				this.log.error(e, `Error reading ${filePath} (projectFilePath ${projectFilePath})`);
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
	async getMultipleFileContentsAsXml(filePaths: string | string[]): Promise<string> {
		if (!Array.isArray(filePaths)) {
			filePaths = parseArrayParameterValue(filePaths);
		}
		const fileContents: Map<string, string> = await this.getMultipleFileContents(filePaths);
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
		const path = filePath.startsWith('/') ? resolve(this.basePath, filePath.slice(1)) : resolve(this.basePath, this.workingDirectory, filePath);
		try {
			await fs.access(path);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Writes to a file. If the file exists it will overwrite the contents.
	 * @param filePath The file path
	 * @param contents The contents to write to the file
	 */
	@func()
	async writeFile(filePath: string, contents: string): Promise<void> {
		// TODO check filePath is not relative above basePath
		// TODO writeFile: ensure directory exists
		// await fs.mkdir(dir, { recursive: true });
		writeFileSync(join(this.basePath, filePath), contents);
	}

	/**
	 * Makes changes to the contents of a single file (using a LLM)
	 * @param filePath the file to edit
	 * @param descriptionOfChanges a natual language description of the changes to make to the file contents
	 */
	@func()
	async updateFileContentsAsRequired(filePath: string, descriptionOfChanges: string): Promise<void> {
		const contents = await this.getFileContents(filePath);
		const updatedContent = await new UtilFunctions().processText(contents, descriptionOfChanges);
		await this.writeFile(filePath, updatedContent);
	}

	// https://github.com/BurntSushi/ripgrep
}
