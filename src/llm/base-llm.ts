import { CDATA_END, CDATA_START } from '#utils/xml-utils';
import { FunctionResponse, GenerateFunctionOptions, GenerateJsonOptions, GenerateTextOptions, LLM } from './llm';
import { extractJsonResult, extractStringResult, parseFunctionCallsXml } from './responseParsers';

export interface SerializedLLM {
	service: string;
	model: string;
}

export abstract class BaseLLM implements LLM {
	constructor(
		protected readonly displayName: string,
		protected readonly service: string,
		protected readonly model: string,
		private maxInputTokens: number,
		private calculateInputCost: (input: string) => number,
		private calculateOutputCost: (output: string) => number,
	) {}

	async generateFunctionResponse(prompt: string, systemPrompt?: string, opts?: GenerateFunctionOptions): Promise<FunctionResponse> {
		const response = await this.generateText(prompt, systemPrompt, opts);
		return {
			textResponse: response,
			functions: parseFunctionCallsXml(response),
		};
	}

	async generateTextWithResult(prompt: string, systemPrompt?: string, opts?: GenerateTextOptions): Promise<string> {
		const response = await this.generateText(prompt, systemPrompt, opts);
		return extractStringResult(response);
	}

	async generateJson(prompt: string, systemPrompt?: string, opts?: GenerateJsonOptions): Promise<any> {
		const response = await this.generateText(prompt, systemPrompt, opts ? { type: 'json', ...opts } : { type: 'json' });
		return extractJsonResult(response);
	}

	abstract generateText(prompt: string, systemPrompt?: string, opts?: GenerateTextOptions): Promise<string>;

	getMaxInputTokens(): number {
		return this.maxInputTokens;
	}

	getInputCostPerToken(): (input: string) => number {
		return this.calculateInputCost;
	}

	getOutputCostPerToken(): (output: string) => number {
		return this.calculateOutputCost;
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

	getDisplayName(): string {
		return this.displayName;
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
