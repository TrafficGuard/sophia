import * as console from 'console';
import { FileSystem } from '../../agent/filesystem';
import { func } from '../../agent/functions';
import { getFileSystem } from '../../agent/workflows';
import { execCmd, execCommand } from '../../utils/exec';
import { VersionControlSystem } from './versionControlSystem';
const util = require('util');
const exec = util.promisify(require('child_process').exec);

export class Git implements VersionControlSystem {
	/** When a new branch is made the original branch is stored. This aids diffing between the branches */
	baseBranch: string;

	constructor(private fileSystem: FileSystem) {}

	/**
	 * Adds all files which are already tracked by version control to the index and commits
	 * @param commitMessage
	 */
	async addAllTrackedAndCommit(commitMessage: string): Promise<void> {
		// TODO check if any unstaged tracked files
		const { exitCode, stdout, stderr } = await execCommand('git add .');
		if (exitCode > 0) throw new Error(`${stdout}\n${stderr}`);

		await this.commit(commitMessage);
	}

	async getFilesAddedInHeadCommit(): Promise<string[]> {
		const { exitCode, stdout, stderr } = await execCommand(`git diff --name-status HEAD^..HEAD | grep '^A'`);
		if (exitCode > 0) throw new Error(stderr);
		// Output is in the format
		// A       etc/newFile
		// A       src/cache/newFile.test.ts
		return stdout.split('\n').map((line) => line.slice(1).trim());
	}

	async init(): Promise<void> {
		const originUrl = await execCmd('git config --get remote.origin.url', this.fileSystem.getWorkingDirectory());
	}

	async getBranchName(): Promise<string> {
		const { exitCode, stdout, stderr } = await execCommand('git rev-parse --abbrev-ref HEAD');
		if (exitCode > 0) throw new Error(`${stdout}\n${stderr}`);
		return stdout.trim();
	}

	async getBranchDiff(sourceBranch: string = this.baseBranch): Promise<string> {
		if (!sourceBranch) throw new Error('Source branch is required');
		const cmd = sourceBranch ? `git merge-base HEAD ${sourceBranch}` : 'git diff $(git merge-base HEAD @{u})';
		const { stdout, stderr } = await execCommand(cmd);
		console.log('1');
		console.log('2');
		console.log('3');
		return stdout;
	}

	@func()
	async getDiff(): Promise<string> {
		const cwd = this.fileSystem.getWorkingDirectory();
		try {
			const { stdout, stderr } = await exec('git diff --color --exit-code', {
				cwd,
			});
			if (stderr.trim().length) {
				throw new Error(stderr);
			}
			return stdout;
		} catch (error) {
			console.error(error);
			throw error;
		}
	}

	@func()
	async createBranch(branchName: string): Promise<void> {
		this.baseBranch = await this.getBranchName();
		const cwd = this.fileSystem.getWorkingDirectory();
		try {
			const { stderr } = await exec(`git branch ${branchName}`, { cwd });
			if (stderr.trim().length) {
				throw new Error(stderr);
			}
		} catch (error) {
			console.error(error);
			throw error;
		}
	}
	@func()
	async cloneBranch(repoUrl: string, branchName: string): Promise<void> {
		const cwd = this.fileSystem.getWorkingDirectory();
		try {
			const { stderr } = await exec(`git clone -b ${branchName} ${repoUrl}`, {
				cwd,
			});
			if (stderr.trim().length) {
				throw new Error(stderr);
			}
		} catch (error) {
			console.error(error);
			throw error;
		}
	}
	@func()
	async commit(commitMessage: string): Promise<void> {
		const cwd = this.fileSystem.getWorkingDirectory();
		try {
			const sanitizedMessage = commitMessage.replace(/"/g, '\\"');
			const { stderr } = await exec(`git commit -m "${sanitizedMessage}"`, {
				cwd,
			});
			if (stderr.trim().length) {
				throw new Error(stderr);
			}
		} catch (error) {
			console.error(error);
			throw error;
		}
	}
}
