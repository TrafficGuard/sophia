import { getFileSystem } from '#agent/agentContext';
import { funcClass } from '#functionSchema/functionDecorators';
import { logger } from '#o11y/logger';
import { execCmd, execCommand } from '#utils/exec';
import { LanguageTools } from '../languageTools';
import {getPythonPath} from "#swe/codeEditor";

@funcClass(__filename)
export class PythonTools implements LanguageTools {
	async generateProjectMap(): Promise<string> {
		logger.info(getFileSystem().getWorkingDirectory());
		const { stdout, stderr /*, exitCode*/ } = await execCmd(`${getPythonPath()} -m aider --show-repo-map`);
		// stubgen --ignore-errors -o stubs

		// if (exitCode > 0) throw new Error(`${stdout} ${stderr}`);
		return stdout;
	}

	async installPackage(packageName: string): Promise<void> {}

	getInstalledPackages(): Promise<string> {
		return Promise.resolve('');
	}
}
