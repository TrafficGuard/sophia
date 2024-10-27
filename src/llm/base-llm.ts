import { StreamTextResult } from 'ai';
import { AgentContext } from '#agent/agentContextTypes';
import { countTokens } from '#llm/tokens';
import { FunctionResponse, GenerateFunctionOptions, GenerateJsonOptions, GenerateTextOptions, LLM, LlmMessage } from './llm';
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
		/** Needed for Aider when we only have the text size */
		public readonly calculateInputCost: (input: string) => number,
		/** Needed for Aider when we only have the text size */
		public readonly calculateOutputCost: (output: string) => number,
	) {}

	protected _generateText(systemPrompt: string | undefined, userPrompt: string, opts?: GenerateTextOptions): Promise<string> {
		throw new Error('Not implemented');
	}

	protected supportsGenerateTextFromMessages(): boolean {
		return false;
	}

	protected parseGenerateTextParameters(
		userOrSystemOrMessages: string | LlmMessage[],
		userOrOptions?: string | GenerateTextOptions,
		opts?: GenerateTextOptions,
	): { messages: LlmMessage[]; options?: GenerateTextOptions } {
		let messages: LlmMessage[];
		let options: GenerateTextOptions | undefined;

		if (Array.isArray(userOrSystemOrMessages)) {
			messages = userOrSystemOrMessages;
			options = userOrOptions as GenerateTextOptions;
		} else {
			const userPrompt = userOrSystemOrMessages;
			let systemPrompt: string | undefined;
			if (typeof userOrOptions === 'string') {
				systemPrompt = userOrOptions;
				options = opts;
			} else {
				systemPrompt = undefined;
				options = userOrOptions;
			}

			messages = [];
			if (systemPrompt) {
				messages.push({
					role: 'system',
					content: systemPrompt,
				});
			}
			messages.push({
				role: 'user',
				content: userPrompt,
			});
		}

		return { messages, options };
	}

	generateText(userPrompt: string, opts?: GenerateTextOptions): Promise<string>;
	generateText(systemPrompt: string, userPrompt: string, opts?: GenerateTextOptions): Promise<string>;
	generateText(messages: LlmMessage[], opts?: GenerateTextOptions): Promise<string>;
	async generateText(userOrSystemOrMessages: string | LlmMessage[], userOrOpts?: string | GenerateTextOptions, opts?: GenerateTextOptions): Promise<string> {
		const { messages, options } = this.parseGenerateTextParameters(userOrSystemOrMessages, userOrOpts, opts);
		if (!this.supportsGenerateTextFromMessages()) {
			if (messages.length > 2) throw new Error('LLM service/model doesnt support multiple user messages');
			const hasSystemPrompt = messages[0].role === 'system';
			const systemPrompt = hasSystemPrompt ? (messages[0].content as string) : undefined;
			const userPrompt = hasSystemPrompt ? (messages[1].content as string) : (messages[0].content as string);
			return this._generateText(systemPrompt, userPrompt, opts);
		}
		return this.generateTextFromMessages(messages, options);
	}

	async generateFunctionResponse(systemPrompt: string, prompt: string, opts?: GenerateFunctionOptions): Promise<FunctionResponse> {
		const response = await this._generateText(systemPrompt, prompt, opts);
		return {
			textResponse: response,
			functions: parseFunctionCallsXml(response),
		};
	}

	generateTextWithResult(userPrompt: string, opts?: GenerateTextOptions): Promise<string>;
	generateTextWithResult(systemPrompt: string, userPrompt: string, opts?: GenerateTextOptions): Promise<string>;
	generateTextWithResult(messages: LlmMessage[], opts?: GenerateTextOptions): Promise<string>;
	async generateTextWithResult(
		userOrSystemOrMessages: string | LlmMessage[],
		userOrOpts?: string | GenerateTextOptions,
		opts?: GenerateTextOptions,
	): Promise<string> {
		const { messages, options } = this.parseGenerateTextParameters(userOrSystemOrMessages, userOrOpts, opts);
		const response = await this.generateText(messages, options);
		return extractStringResult(response);
	}

	generateJson<T>(userPrompt: string, opts?: GenerateJsonOptions): Promise<T>;
	generateJson<T>(systemPrompt: string, userPrompt: string, opts?: GenerateJsonOptions): Promise<T>;
	generateJson<T>(messages: LlmMessage[], opts?: GenerateJsonOptions): Promise<T>;
	async generateJson<T>(userOrSystemOrMessages: string | LlmMessage[], userOrOpts?: string | GenerateJsonOptions, opts?: GenerateJsonOptions): Promise<T> {
		const { messages, options } = this.parseGenerateTextParameters(userOrSystemOrMessages, userOrOpts, opts);
		const combinedOptions: GenerateTextOptions = options ? { ...options, type: 'json' } : { type: 'json' };
		const response = await this.generateText(messages, combinedOptions);
		return extractJsonResult(response);
	}

	getMaxInputTokens(): number {
		return this.maxInputTokens;
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

	calculateCost(input: string, output: string): [totalCost: number, inputCost: number, outputCost: number] {
		const inputCost = this.calculateInputCost(input);
		const outputCost = this.calculateOutputCost(output);
		const totalCost = inputCost + outputCost;
		return [totalCost, inputCost, outputCost];
	}

	countTokens(text: string): Promise<number> {
		// defaults to gpt4o token parser
		return countTokens(text);
	}

	protected generateTextFromMessages(llmMessages: LlmMessage[], opts?: GenerateTextOptions): Promise<string> {
		throw new Error('Not implemented');
	}

	async streamText(llmMessages: LlmMessage[], onChunk: ({ string }) => void, opts?: GenerateTextOptions): Promise<StreamTextResult<any>> {
		throw new Error('Not implemented');
	}

	isConfigured(): boolean {
		// Default implementation, should be overridden by specific LLM implementations
		return true;
	}

	protected callStack(agent?: AgentContext): string {
		if (!agent) return '';
		const arr: string[] = agent.callStack;
		if (!arr || arr.length === 0) return '';
		if (arr.length === 1) return arr[0];
		// Remove duplicates from when we call multiple in parallel, eg in findFilesToEdit
		let i = arr.length - 1;
		while (i > 0 && arr[i] === arr[i - 1]) {
			i--;
		}

		return arr.slice(0, i + 1).join(' > ');
	}
}
