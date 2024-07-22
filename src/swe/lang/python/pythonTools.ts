import { funcClass } from '#functionSchema/functionDecorators';
import { execCommand } from '#utils/exec';
import { LanguageTools } from '../languageTools';

@funcClass(__filename)
export class PythonTools implements LanguageTools {
	async generateProjectMap(): Promise<string> {
		const { stdout, stderr, exitCode } = await execCommand('aider --show-repo-map');
		if (exitCode > 0) throw new Error(`${stdout} ${stderr}`);
		return stdout;
	}

	async installPackage(packageName: string): Promise<void> {}

	getInstalledPackages(): Promise<string> {
		return Promise.resolve('');
	}
}
