import { logger } from '#o11y/logger';
import { BaseLLM } from './base-llm';

export interface LLM {
	generateText(prompt: string, systemPrompt?: string, type?: 'text' | 'json' | 'result' | 'function'): Promise<string>;
	/* Generates a response that is expected to be in JSON format, and returns the object */
	generateTextAsJson(prompt: string): Promise<any>;
	/**
	 * Generates a response that is expected to have the <result></result> element, and returns the text in it.
	 * This useful when you want to LLM to output discovery, reasoning, etc. to improve the answer, but only want the final result.
	 */
	generateTextWithResult(prompt: string, systemPrompt?: string): Promise<string>;
	/**
	 * Generates a response expecting to contain the <function_call> element matching the FunctionResponse type
	 * @param prompt
	 * @param systemPrompt
	 */
	generateTextExpectingFunctions(prompt: string, systemPrompt?: string): Promise<FunctionResponse>;

	/**
	 * The service provider of the LLM (OpenAI, Google, TogetherAI etc)
	 */
	getService(): string;

	/**
	 * The LLM model identifier
	 */
	getModel(): string;

	/**
	 * The LLM identifier in the format service:model
	 */
	getId(): string;

	/**
	 * Formats the output of a successful function call
	 * @param toolName
	 * @param result
	 */
	formatFunctionResult(toolName: string, result: any): string;
	/**
	 * Formats the output of a failed function call
	 * @param toolName
	 * @param error
	 */
	formatFunctionError(toolName: string, error: any): string;
	/** The maximum number of input tokens */
	getMaxInputTokens(): number;
}

/**
 * The difficulty of a LLM generative task. Used to select an appropriate model for the cost vs capability.
 */
export type TaskLevel = 'easy' | 'medium' | 'hard' | 'xhard';

/**
 * The parsed response from an LLM when expecting it to respond with <function_calls></function_calls>
 */
export interface FunctionResponse {
	/** The response from the LMM upto the <function_calls> element */
	textResponse: string;
	/** The parsed <function_calls> element */
	functions: FunctionCalls;
}

export interface FunctionCalls {
	invoke: Invoke[];
}

export interface Invoke {
	tool_name: string;
	parameters: { [key: string]: any };
}

export interface Invoked extends Invoke {
	stdout?: string;
	stderr?: string;
}

export function combinePrompts(userPrompt: string, systemPrompt?: string): string {
	systemPrompt = systemPrompt ? `${systemPrompt}\n` : '';
	return `${systemPrompt}${userPrompt}`;
}

/**
 * Decorator to log the prompt and response
 * @param originalMethod
 * @param context
 * @returns
 */
export function logTextGeneration(originalMethod: any, context: ClassMethodDecoratorContext): any {
	return async function replacementMethod(this: BaseLLM, ...args: any[]) {
		// system prompt
		if (args.length > 1) {
			// logger.info('= SYSTEM PROMPT ==========================================');
			// logger.info(args[1]);
		}
		logger.info('= USER PROMPT ====================================================================================================');
		logger.info(args[0]);

		const start = Date.now();
		const result = await originalMethod.call(this, ...args);
		logger.info(`= RESPONSE ${this.model} =========================================================================================`);
		logger.info(result);
		const duration = `${((Date.now() - start) / 1000).toFixed(1)}s`;
		logger.info(`${duration}  <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<`);
		return result;
	};
}

export function logDuration(originalMethod: any, context: ClassMethodDecoratorContext): any {
	const functionName = String(context.name);
	return async function replacementMethod(this: BaseLLM, ...args: any[]) {
		const start = Date.now();
		const result = await originalMethod.call(this, ...args);
		console.log(`${functionName} took ${Date.now() - start}ms`);
		return result;
	};
}
