import { funcClass } from '../../agent/metadata';
import { execCommand } from '../../utils/exec';
import { LanguageTools } from '../lang/languageTools';

@funcClass(__filename)
export class PythonTools implements LanguageTools {
	async generateProjectMap(): Promise<string> {
		const { stdout, stderr, exitCode } = await execCommand('aider --show-repo-map');
		if (exitCode > 0) throw new Error(`${stdout} ${stderr}`);
		return stdout;
	}
}
