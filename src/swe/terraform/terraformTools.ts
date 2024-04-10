import { funcClass } from '../../agent/metadata';
import { LanguageTools } from '../lang/languageTools';

@funcClass(__filename)
export class TerraformTools implements LanguageTools {
	async generateProjectMap(): Promise<string> {
		throw new Error('Not implemented');
	}
}
