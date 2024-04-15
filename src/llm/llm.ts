import { agentContext } from '#agent/agentContext';
import { BaseLLM } from './base-llm';

export interface LLM {
	generateText(prompt: string, systemPrompt?: string): Promise<string>;
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
	 * The LLM model identifier
	 */
	getModelName(): string;
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

export interface FunctionResponse {
	response: string;
	functions: FunctionCalls;
}

export interface FunctionCalls {
	invoke: Invoke[];
}

export interface Invoke {
	tool_name: string;
	parameters: { [key: string]: string };
}

export function combinePrompts(userPrompt: string, systemPrompt?: string): string {
	return systemPrompt ? `${systemPrompt}/n${userPrompt}` : userPrompt;
}

/**
 * Decorator to log the prompt and response
 * @param originalMethod
 * @param context
 * @returns
 */
export function logTextGeneration(originalMethod: any, context: ClassMethodDecoratorContext): any {
	return async function replacementMethod(this: BaseLLM, ...args: any[]) {
		console.log('= PROMPT ==========================================');
		// system prompt
		// if (args.length > 1) console.log(args[1]);
		// prompt
		const start = Date.now();
		console.log(args[0]);
		const result = await originalMethod.call(this, ...args);
		console.log(`= RESPONSE ${this.model} =========================================================================================`);
		console.log(result);
		const duration = `${((Date.now() - start) / 1000).toFixed(1)}s`;
		console.log(`${duration}  <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<`);
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

/**
 * AI generated code, not yet reviewed or tested
 * Decorator to record the cost of a workflow/llm call.
 * @param originalMethod
 * @param context
 */
export function recordTextGenerationCosts(originalMethod: any, context: ClassMethodDecoratorContext): any {
	const functionName = String(context.name);
	return async function replacementMethod(this: BaseLLM, ...args: any[]) {
		const systemPrompt = args.length > 1 ? args[1] : '';
		const userPrompt = args[0];

		const response = await originalMethod.call(this, ...args);

		const agentCtx = agentContext.getStore();
		const inputCost = this.getInputCostPerToken() * prompt.length;
		const outputCost = this.getOutputCostPerToken() * response.length;
		const totalCost = inputCost + outputCost;
		agentCtx.cost += totalCost;
		agentCtx.budgetRemaining = Math.max(agentCtx.budgetRemaining - totalCost, 0);

		return response;
	};
}
