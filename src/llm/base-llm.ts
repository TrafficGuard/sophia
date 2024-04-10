import { CDATA_END, CDATA_START } from '../utils/xml-utils';
import { FunctionResponse, LLM } from './llm';
import { extractJsonResult, extractStringResult, parseFunctionCallsXml } from './responseParsers';

export abstract class BaseLLM implements LLM {
	constructor(
		protected readonly model: string,
		private maxInputTokens: number,
		private inputCostPerToken: number,
		private outputCostPerToken: number,
	) {}

	async generateTextExpectingFunctions(prompt: string, systemPromt?: string): Promise<FunctionResponse> {
		const response = await this.generateText(prompt, systemPromt);
		return {
			response: response,
			functions: parseFunctionCallsXml(response),
		};
	}

	async generateTextWithResult(prompt: string, systemPrompt?: string): Promise<string> {
		const response = await this.generateText(prompt, systemPrompt);
		return extractStringResult(response);
	}

	async generateTextAsJson(prompt: string, systemPrompt?: string): Promise<any> {
		const response = await this.generateText(prompt, systemPrompt);
		return extractJsonResult(response);
	}

	abstract generateText(prompt: string, systemPrompt?: string): Promise<string>;

	getMaxInputTokens(): number {
		return this.maxInputTokens;
	}

	getInputCostPerToken(): number {
		return this.inputCostPerToken;
	}

	getOutputCostPerToken(): number {
		return this.outputCostPerToken;
	}

	isRetryableError(e: any): boolean {
		return false;
	}

	getModelName(): string {
		return `${this.constructor.name}:${this.model}`;
	}

	formatFunctionResult(toolName: string, result: any): string {
		// TODO include the params
		return `<function_results>
        <result>
        <tool_name>${toolName}</tool_name>
        <stdout>${CDATA_START}
        ${JSON.stringify(result)}
        ${CDATA_END}</stdout>
        </result>
        </function_results>
        `;
	}

	formatFunctionError(error: any): string {
		// TODO include the params
		return `<function_results>
        <error>${CDATA_START}
        ${JSON.stringify(error)}
        ${CDATA_END}</error>
        </function_results>`;
	}
}
