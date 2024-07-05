import { logger } from '#o11y/logger';
import { BaseLLM } from './base-llm';

// https://github.com/AgentOps-AI/tokencost/blob/main/tokencost/model_prices.json

export interface GenerateTextOptions {
	type?: 'text' | 'json';
	/** Identifier used in trace spans, UI etc */
	id?: string;
	/**
	 * Temperature controls the randomness in token selection. Valid values are between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic. Defaults to 1
	 * We generally recommend altering this or top_p but not both.
	 */
	temperature?: number;
	/**
	 * Top-p changes how the model selects tokens for output. Tokens are selected from most probable to least until the sum of their probabilities equals the top-p value. For example, if tokens A, B, and C have a probability of .3, .2, and .1 and the top-p value is .5, then the model will select either A or B as the next token (using temperature).
	 */
	topP?: number;

	stopSequences?: string[];
}

export type GenerateJsonOptions = Omit<GenerateTextOptions, 'type'>;

export interface LLM {
	/* Generates text from a LLM */
	generateText(userPrompt: string, systemPrompt?: string, opts?: GenerateTextOptions): Promise<string>;

	/* Generates a response that is expected to be in JSON format, and returns the object */
	generateTextAsJson<T>(userPrompt: string, systemPrompt?: string, opts?: GenerateJsonOptions): Promise<T>;

	/**
	 * Generates a response that is expected to have the <result></result> element, and returns the text inside it.
	 * This useful when you want to LLM to output discovery, reasoning, etc. to improve the answer, and only want the final result returned.
	 */
	generateTextWithResult(prompt: string, systemPrompt?: string, opts?: GenerateTextOptions): Promise<string>;

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

	getDisplayName(): string;

	/**
	 * The LLM identifier in the format service:model
	 */
	getId(): string;

	/**
	 * Formats the output of a successful function call
	 * @param functionName
	 * @param result
	 */
	formatFunctionResult(functionName: string, result: any): string;

	/**
	 * Formats the output of a failed function call
	 * @param functionName
	 * @param error
	 */
	formatFunctionError(functionName: string, error: any): string;

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
	functionCalls: FunctionCall[];
}

export interface FunctionCall {
	function_name: string;
	parameters: { [key: string]: any };
}

/**
 * A completed FunctionCall with the output/error.
 */
export interface FunctionCallResult extends FunctionCall {
	stdout?: string;
	stdoutSummary?: string;
	stderr?: string;
	stderrSummary?: string;
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
			logger.info('= SYSTEM PROMPT ==========================================');
			logger.info(args[1]);
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
