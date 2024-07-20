import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface CliOptions {
	initialPrompt: string;
	resumeLastRun: boolean;
}

function parseProcessArgs(args: string[]): { resumeLastRun: boolean; remainingArgs: string[] } {
    let resumeLastRun = false;
    let i = 0;
    for (; i < args.length; i++) {
        if (args[i] === '-r') {
            resumeLastRun = true;
        } else {
            break;
        }
    }
    return { resumeLastRun, remainingArgs: args.slice(i) };
}

export function parseCliArgs(): CliOptions {
    const { resumeLastRun, remainingArgs } = parseProcessArgs(process.argv.slice(2));
    const initialPrompt = remainingArgs.join(' ');
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
