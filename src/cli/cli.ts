import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path, { join } from 'path';
import { logger } from '#o11y/logger';
import { systemDir } from '../appVars';

export interface CliOptions {
	/** Name of the executed .ts file without the extension */
	scriptName: string;
	initialPrompt: string;
	resumeAgentId: string | undefined;
}

export function parseProcessArgs(): CliOptions {
	const scriptPath = process.argv[1];
	let scriptName = scriptPath.split(path.sep).at(-1);
	scriptName = scriptName.substring(0, scriptName.length - 3);
	return parseUserCliArgs(scriptName, process.argv.splice(2));
}

export function parseUserCliArgs(scriptName: string, args: string[]): CliOptions {
	let resumeLastRun = false;
	let i = 0;
	for (; i < args.length; i++) {
		if (args[i] === '-r') {
			resumeLastRun = true;
		} else {
			break;
		}
	}
	let initialPrompt = args.slice(i).join(' ');

	logger.info(initialPrompt);

	// If not prompt provided then load from file
	if (!initialPrompt.trim()) {
		if (existsSync(`src/cli/${scriptName}-in`)) initialPrompt = readFileSync(`src/cli/${scriptName}-in`, 'utf-8');
	}

	logger.info(initialPrompt);

	const resumeAgentId = resumeLastRun ? getLastRunAgentId(scriptName) : undefined;

	return { scriptName, resumeAgentId, initialPrompt };
}

export function saveAgentId(scriptName: string, agentId: string): void {
	const dirPath = join(systemDir(), 'cli');
	mkdirSync(dirPath, { recursive: true });
	writeFileSync(join(dirPath, `${scriptName}.lastRun`), agentId);
}

export function getLastRunAgentId(scriptName: string): string | undefined {
	const filePath = join(systemDir(), 'cli', `${scriptName}.lastRun`);
	if (existsSync(filePath)) {
		return readFileSync(filePath, 'utf-8').trim();
	}
	logger.warn(`No agent to resume for ${scriptName} script`);
	return undefined;
}
