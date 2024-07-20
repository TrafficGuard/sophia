import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface CliOptions {
	initialPrompt: string;
	resumeLastRun: boolean;
}

export function parseCliOptions(argv: string[]): CliOptions {
	const args = argv.slice(2);
	let resumeLastRun = false;
	let initialPrompt = '';

	for (let i = 0; i < args.length; i++) {
		if (args[i] === '-r') {
			resumeLastRun = true;
		} else {
			initialPrompt = args.slice(i).join(' ');
			break;
		}
	}

	return { initialPrompt, resumeLastRun };
}

export function saveAgentId(scriptName: string, agentId: string): void {
	const dirPath = join(process.cwd(), '.nous', 'cli');
	mkdirSync(dirPath, { recursive: true });
	writeFileSync(join(dirPath, `${scriptName}.lastRun`), agentId);
}

export function getLastRunAgentId(scriptName: string): string | null {
	const filePath = join(process.cwd(), '.nous', 'cli', `${scriptName}.lastRun`);
	if (existsSync(filePath)) {
		return readFileSync(filePath, 'utf-8').trim();
	}
	return null;
}
