import { llms } from '#agent/agentContext';
import { func } from '#agent/functions';
import { funcClass } from '#agent/metadata';

@funcClass(__filename)
export class UtilFunctions {
	/**
	 * Uses a large language model to make changes to the input content by applying the provided natural language instruction
	 * @param text the input text
	 * @param descriptionOfChanges a description of the changes to make to the text
	 * @returns the modified text
	 */
	@func()
	async processText(text: string, descriptionOfChanges: string): Promise<string> {
		const prompt = `<input>${text}<input>\n` + `<action>\n${descriptionOfChanges}. Output the response inside <response></response> tags.\n</action>`;
		const response = await llms().medium.generateText(prompt);
		response.trim().slice('<response>'.length, '</response>'.length * -1);
		return text;
	}
}
