import { CDATA_END, CDATA_START } from '#utils/xml-utils';
import { FunctionResponse, LLM } from './llm';
import { extractJsonResult, extractStringResult, parseFunctionCallsXml } from './responseParsers';

export interface SerializedLLM {
	service: string;
	model: string;
}

export type GenerationMode = 'text' | 'json';

export abstract class BaseLLM implements LLM {
	constructor(
		protected readonly service: string,
		protected readonly model: string,
		private maxInputTokens: number,
		private inputCostPerChar: number,
		private outputCostPerChar: number,
	) {}

	async generateTextExpectingFunctions(prompt: string, systemPrompt?: string): Promise<FunctionResponse> {
		const response = await this.generateText(prompt, systemPrompt);
		return {
			textResponse: response,
			functions: parseFunctionCallsXml(response),
		};
	}

	async generateTextWithResult(prompt: string, systemPrompt?: string): Promise<string> {
		const response = await this.generateText(prompt, systemPrompt);
		return extractStringResult(response);
	}

	async generateTextAsJson(prompt: string, systemPrompt?: string): Promise<any> {
		const response = await this.generateText(prompt, systemPrompt, 'json');
		return extractJsonResult(response);
	}

	abstract generateText(prompt: string, systemPrompt?: string, mode?: GenerationMode): Promise<string>;

	getMaxInputTokens(): number {
		return this.maxInputTokens;
	}

	getInputCostPerToken(): number {
		return this.inputCostPerChar;
	}

	getOutputCostPerToken(): number {
		return this.outputCostPerChar;
	}

	isRetryableError(e: any): boolean {
		return false;
	}

	getModel(): string {
		return this.model;
	}

	getService(): string {
		return this.service;
	}

	getId(): string {
		return `${this.service}:${this.model}`;
	}

	formatFunctionResult(functionName: string, result: any): string {
		return `<function_results>
        <result>
        <function_name>${functionName}</function_name>
        <stdout>${CDATA_START}
        ${JSON.stringify(result)}
        ${CDATA_END}</stdout>
        </result>
        </function_results>
        `;
	}

	formatFunctionError(functionName: string, error: any): string {
		return `<function_results>
		<function_name>${functionName}</function_name>
        <error>${CDATA_START}
        ${JSON.stringify(error)}
        ${CDATA_END}</error>
        </function_results>`;
	}
}
