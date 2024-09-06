import { llms } from '#agent/agentContextLocalStorage';
import { func, funcClass } from '#functionSchema/functionDecorators';

@funcClass(__filename)
export class LlmTools {
	/**
	 * Uses a large language model to transform the input content by applying the provided natural language instruction
	 * @param text the input text
	 * @param descriptionOfChanges a description of the changes/processing to apply to the text
	 * @returns the processed text
	 */
	@func()
	async processText(text: string, descriptionOfChanges: string): Promise<string> {
		const prompt = `<input>${text}<input>\n` + `<action>\n${descriptionOfChanges}. Output the response inside <result></result> tags.\n</action>`;
		return await llms().medium.generateTextWithResult(prompt);
	}
}
