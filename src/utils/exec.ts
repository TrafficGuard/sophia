import { ExecException, SpawnOptionsWithoutStdio, exec, spawn } from 'child_process';
import { ExecOptions } from 'node:child_process';
import os from 'os';
import { promisify } from 'util';
import { SpanStatusCode } from '@opentelemetry/api';
import { getFileSystem } from '#agent/agentContext';
import { logger } from '#o11y/logger';
import { withSpan } from '#o11y/trace';

const execAsync = promisify(exec);
/**
 * Throws an exception if the result of an execCmd has an error
 * @param result
 * @param message
 */
export function checkExecResult(result: ExecResults, message: string) {
	if (result.error) {
		logger.info(result.stdout);
		logger.error(result.stderr);
		throw new Error(`Error executing command: ${result.cmd} in ${result.cwd ?? '.'}\n${message}: ${result.error.message}`);
	}
}

export interface ExecResults {
	cmd: string;
	stdout: string;
	stderr: string;
	error: ExecException | null;
	cwd?: string;
}

/**
 * @param command
 * @param cwd current working directory
 * @returns
 */
export async function execCmd(command: string, cwd = ''): Promise<ExecResults> {
	return withSpan('execCommand', async (span) => {
		const home = process.env.HOME;
		logger.info(`execCmd ${home ? command.replace(home, '~') : command} ${cwd}`);
		// return {
		//     stdout: '', stderr: '', error: null
		// }
		// Need the right shell so git commands work (by having the SSH keys)
		const shell = os.platform() === 'darwin' ? '/bin/zsh' : '/bin/bash';
		console.log(shell);
		for (let i = 1; i <= 3; i++) {
			const result = await new Promise<ExecResults>((resolve, reject) => {
				exec(command, { cwd, shell }, (error, stdout, stderr) => {
					resolve({
						cmd: command,
						stdout,
						stderr,
						error,
						cwd,
					});
				});
			});
			if (!result.error || i === 3) {
				span.setAttributes({
					cwd,
					command,
					stdout: result.stdout,
					stderr: result.stderr,
					exitCode: result.error ? 1 : 0,
				});
				span.setStatus({ code: result.error ? SpanStatusCode.ERROR : SpanStatusCode.OK });
				return result;
			}
			logger.info(`Retrying ${command}`);
			await new Promise((resolve) => setTimeout(resolve, 1000 * i));
		}
	});
}

export interface ExecResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

export async function execCommand(command: string, workingDirectory?: string): Promise<ExecResult> {
	return withSpan('execCommand', async (span) => {
		const options: ExecOptions = { cwd: workingDirectory ?? getFileSystem().getWorkingDirectory() };
		try {
			logger.info(`${options.cwd} % ${command}`);
			const { stdout, stderr } = await execAsync(command, options);

			span.setAttributes({
				cwd: options.cwd as string,
				command,
				stdout,
				stderr,
				exitCode: 0,
			});
			span.setStatus({ code: SpanStatusCode.OK });
			return { stdout, stderr, exitCode: 0 };
		} catch (error) {
			span.setAttributes({
				cwd: options.cwd as string,
				command,
				stdout: error.stdout,
				stderr: error.stderr,
				exitCode: error.code,
			});
			span.recordException(error);
			span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
			logger.error(error, `Error executing ${command}`);
			return { stdout: error.stdout, stderr: error.stderr, exitCode: error.code };
		}
	});
}

export async function spawnCommand(command: string, workingDirectory?: string): Promise<ExecResult> {
	return withSpan('spawnCommand', async (span) => {
		const cwd = workingDirectory ?? getFileSystem().getWorkingDirectory();
		const options: SpawnOptionsWithoutStdio = { cwd };
		try {
			logger.info(`${options.cwd} % ${command}`);
			const { stdout, stderr, code } = await spawnAsync(command, options);

			span.setAttributes({
				cwd,
				command,
				stdout,
				stderr,
				exitCode: 0,
			});
			span.setStatus({ code: SpanStatusCode.OK });
			return { stdout, stderr, exitCode: 0 };
		} catch (error) {
			span.setAttributes({
				cwd,
				command,
				stdout: error.stdout,
				stderr: error.stderr,
				exitCode: error.code,
			});
			span.recordException(error);
			span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
			logger.error(error, `Error executing ${command}`);
			return { stdout: error.stdout, stderr: error.stderr, exitCode: error.code };
		}
	});
}

function spawnAsync(command: string, options: SpawnOptionsWithoutStdio): Promise<{ stdout: string; stderr: string; code: number }> {
	return withSpan('spawnCommand', async (span) => {
		return new Promise((resolve, reject) => {
			const process = spawn(command, [], { ...options, shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
			let stdout = '';
			let stderr = '';

			process.stdout.on('data', (data) => {
				stdout += data.toString();
			});

			process.stderr.on('data', (data) => {
				stderr += data.toString();
			});

			process.on('close', (code) => {
				span.setAttributes({
					cwd: options.cwd.toString(),
					command,
					stdout,
					stderr,
					exitCode: code,
				});
				span.setStatus({ code: code === 0 ? SpanStatusCode.OK : SpanStatusCode.ERROR });

				if (code === 0) {
					resolve({ stdout, stderr, code });
				} else {
					const error = new Error(`Command failed: ${command}`) as any;
					error.stdout = stdout;
					error.stderr = stderr;
					error.code = code;
					reject(error);
				}
			});
		});
	});
}
