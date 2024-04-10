import { func } from '../../agent/functions';
import { funcClass } from '../../agent/metadata';
import { LanguageTools } from '../lang/languageTools';

@funcClass(__filename)
export class PhpTools implements LanguageTools {
	/**
	 * Generates an outline of a PHP project
	 */
	@func
	async generateProjectMap(): Promise<string> {
		throw new Error('Not implemented');
	}
}
