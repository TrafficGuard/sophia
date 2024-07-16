import { agentContext } from '#agent/agentContext';
import { logger } from '#o11y/logger';
import { func, funcClass } from '../functionDefinition/functionDecorators';

export const AGENT_COMPLETED_NAME = 'Agent.completed';

export const AGENT_REQUEST_FEEDBACK = 'Agent.requestFeedback';

export const REQUEST_FEEDBACK_PARAM_NAME = 'request';

/**
 * Functions for the agent to manage its memory and execution
 */
@funcClass(__filename)
export class Agent {
	/**
	 * Request feedback/interaction from a supervisor when a decision or approval needs to be made, or additional details are required, before proceeding with the plan.
	 * @param request {string} Notes on what additional information/decision is required. Be specific on what you have been doing up to this point, and provide relevant information to help with the decision/feedback.
	 */
	@func()
	async requestFeedback(request: string): Promise<void> {
		// arg name must match REQUEST_FEEDBACK_PARAM_NAME
		logger.info(`Feedback requested: ${request}`);
	}

	/**
	 * Notifies that the user request has completed and there is no more work to be done, or that no more useful progress can be made with the functions.
	 * @param note {string} A detailed description that answers/completes the user request.
	 */
	@func()
	async completed(note: string): Promise<void> {
		logger.info(`Agent completed. Note: ${note}`);
	}

	/**
	 * Stores content to your working memory, and continues on with the plan. You can assume the memory element now contains this key and content.
	 * @param key {string} A descriptive identifier (alphanumeric and underscores allowed, under 30 characters) for the new memory contents explaining the source of the content. This must not exist in the current memory.
	 * @param content {string} The plain text contents to store in the working memory
	 */
	@func()
	async saveMemory(key: string, content: string): Promise<void> {
		if (!key || !key.trim().length) throw new Error('Memory key must be provided');
		if (!content || !content.trim().length) throw new Error('Memory content must be provided');
		const memory = agentContext().memory;
		if (memory[key]) logger.info(`Overwriting memory key ${key}`);
		memory[key] = content;
	}

	/**
	 * Updates existing content in your working memory, and continues on with the plan. You can assume the memory element now contains this key and content.
	 * Note this will over-write any existing memory content
	 * @param key {string} An existing key in the memory contents to update the contents of.
	 * @param content {string} The plain text content to store in the working memory under the key
	 */
	@func()
	async deleteMemory(key: string, content: string): Promise<void> {
		const memory = agentContext().memory;
		if (!memory[key]) logger.info(`deleteMemory key doesn't exist: ${key}`);
		delete memory[key];
	}

	/**
	 * Retrieves contents from memory
	 * @param key {string} An existing key in the memory to retrieve.
	 * @return {string} The memory contents
	 */
	@func()
	async getMemory(key: string): Promise<string> {
		if (!key) throw new Error(`Parameter "key" must be provided. Was ${key}`);
		const memory = agentContext().memory;
		if (!memory[key]) throw new Error(`Memory key ${key} does not exist`);
		return memory[key];
	}
}
