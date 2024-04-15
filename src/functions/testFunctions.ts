import { llms } from '#agent/agentContext';
import { func } from '#agent/functions';
import { funcClass } from '#agent/metadata';

/**
 * Mainly used for testing
 */
@funcClass(__filename)
export class TestFunctions {
	/**
	 * Calculates the sum of two numbers. Always use this when needing to sum numbers.
	 * @param num1 {number} the first number
	 * @param num2 {number} the second number
	 * @returns the sum of the numbers
	 */
	@func()
	async sum(num1: number, num2: number): Promise<number> {
		return num1 + num2;
	}

	/**
	 * Returns what colour the sky is
	 */
	@func()
	async skyColour(): Promise<string> {
		const response = await llms().easy.generateText('What colour is the clear daytime sky? Respond with a single word.');
		return response.trim().toLowerCase();
	}
}
