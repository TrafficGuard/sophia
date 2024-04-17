import { ExecException, exec } from 'child_process';
import os from 'os';
import { promisify } from 'util';
import { SpanStatusCode } from '@opentelemetry/api';
import { getFileSystem } from '#agent/agentContext';
import { logger } from '#o11y/logger';
import { withSpan } from '#o11y/trace';

const exec2 = promisify(exec);
/**
 * Throws an exception if the result of an execCmd has an error
 * @param result
 * @param message
 */
export function checkExecResult(result: ExecResults, message: string) {
	if (result.error) {
		console.log(result.stdout);
		console.error(result.stderr);
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
export async function execCmd(command: string, cwd?: string): Promise<ExecResults> {
	const home = process.env.HOME;
	console.log(`execCmd ${home ? command.replace(home, '~') : command} ${cwd ?? ''}`);
	// return {
	//     stdout: '', stderr: '', error: null
	// }
	// Need the right shell so git commands work (by having the SSH keys)
	const shell = os.platform() === 'darwin' ? '/bin/zsh' : '/bin/bash';
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
			return result;
		}
		console.log(`Retrying ${command}`);
		await new Promise((resolve) => setTimeout(resolve, 1000 * i));
	}
	throw new Error('Should never happen');
}

export interface ExecResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

export async function execCommand(command: string, workingDirectory?: string): Promise<ExecResult> {
	return withSpan('execCommand', async (span) => {
		const options = { cwd: workingDirectory ?? getFileSystem().getWorkingDirectory() };
		try {
			logger.info(`${options.cwd} % ${command}`);
			const { stdout, stderr } = await exec2(command, options);

			span.setAttributes({
				cwd: options.cwd,
				command,
				stdout,
				stderr,
				exitCode: 0,
			});
			span.setStatus({ code: SpanStatusCode.OK });
			return { stdout, stderr, exitCode: 0 };
		} catch (error) {
			span.setAttributes({
				cwd: options.cwd,
				command,
				stdout: error.stdout,
				stderr: error.stderr,
				exitCode: error.code,
			});
			span.recordException(error);
			span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
			return { stdout: error.stdout, stderr: error.stderr, exitCode: error.code };
		}
	});
}
