// https://github.com/AgentOps-AI/tokencost/blob/main/tokencost/model_prices.json
import { CoreAssistantMessage, CoreSystemMessage, CoreToolMessage, CoreUserMessage, StreamTextResult } from 'ai';

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

	/**
	 * Strings in the output which will stop generation
	 */
	stopSequences?: string[];
}

/**
 * Options when generating text expecting JSON
 */
export type GenerateJsonOptions = Omit<GenerateTextOptions, 'type'>;

/**
 * Options when generating text expecting function calls
 */
export type GenerateFunctionOptions = Omit<GenerateTextOptions, 'type'>;

type AiMessage = CoreSystemMessage | CoreUserMessage | CoreAssistantMessage | CoreToolMessage;

export type LlmMessage = AiMessage & {
	// /**
	//  * TextPart  { type: "text" , text: string }
	//  * ImagePart { type: "image", image: string | Uint8Array | ArrayBuffer | Buffer | URL, mimeType?: string }
	//  * FilePart  { type: "file", data: string | Uint8Array | ArrayBuffer | Buffer | URL, mimeType: string }
	//  */
	// content: string | Array<TextPart | ImagePart | FilePart>;
	/** The LLM which generated the text (only when role=assistant) */
	llmId?: string;
	/** Set the cache_control flag with Claude models */
	cache?: 'ephemeral';
	/** Time the message was sent */
	time?: number;
};

export function system(text: string, cache = false): LlmMessage {
	return {
		role: 'system',
		content: text,
		cache: cache ? 'ephemeral' : undefined,
	};
}

export function user(text: string, cache = false): LlmMessage {
	return {
		role: 'user',
		content: text,
		cache: cache ? 'ephemeral' : undefined,
	};
}

/**
 * Prefill the assistant message to help guide its response
 * @see https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/prefill-claudes-response
 * @param text
 */
export function assistant(text: string): LlmMessage {
	return {
		role: 'assistant',
		content: text,
	};
}

export interface LLM {
	/* Generates text from a LLM */
	generateText(userPrompt: string, opts?: GenerateTextOptions): Promise<string>;
	generateText(systemPrompt: string, userPrompt: string, opts?: GenerateTextOptions): Promise<string>;
	generateText(messages: LlmMessage[], opts?: GenerateTextOptions): Promise<string>;

	/* Generates a response that is expected to be in JSON format, and returns the object */
	generateJson<T>(userPrompt: string, opts?: GenerateJsonOptions): Promise<T>;
	generateJson<T>(systemPrompt: string, userPrompt: string, opts?: GenerateJsonOptions): Promise<T>;
	generateJson<T>(messages: LlmMessage[], opts?: GenerateJsonOptions): Promise<T>;
	/**
	 * Generates a response that is expected to have the <result></result> element, and returns the text inside it.
	 * This useful when you want to LLM to output discovery, reasoning, etc. to improve the answer, and only want the final result returned.
	 */
	generateTextWithResult(prompt: string, opts?: GenerateTextOptions): Promise<string>;
	generateTextWithResult(systemPrompt: string, prompt: string, opts?: GenerateTextOptions): Promise<string>;
	generateTextWithResult<T>(messages: LlmMessage[], opts?: GenerateTextOptions): Promise<T>;

	/**
	 * Generates a response expecting to contain the <function_call> element matching the FunctionResponse type
	 * @param systemPrompt
	 * @param userPrompt
	 * @param opts
	 */
	generateFunctionResponse(systemPrompt: string, userPrompt: string, opts?: GenerateFunctionOptions): Promise<FunctionResponse>;

	/**
	 * Streams text from the LLM
	 * @param messages
	 * @param onChunk streaming chunk callback
	 * @param opts
	 */
	streamText(messages: LlmMessage[], onChunk: ({ string }) => void, opts?: GenerateTextOptions): Promise<StreamTextResult<any>>;

	/**
	 * The service provider of the LLM (OpenAI, Google, TogetherAI etc)
	 */
	getService(): string;

	/**
	 * The LLM model identifier. This should match the model ids in the Vercel ai module (https://github.com/vercel/ai)
	 */
	getModel(): string;

	/** UI display name */
	getDisplayName(): string;

	/**
	 * The LLM identifier in the format service:model
	 */
	getId(): string;

	/** The maximum number of input tokens */
	getMaxInputTokens(): number;

	/**
	 * Calculate costs for generation
	 * @param input the input text
	 * @param output the output text
	 */
	calculateCost(input: string, output: string): [totalCost: number, inputCost: number, outputCost: number];

	/**
	 * @param text
	 * @returns the number of tokens in the text for this LLM
	 */
	countTokens(text: string): Promise<number>;

	/**
	 * Checks if all necessary configuration variables are set for this LLM.
	 * @returns true if the LLM is properly configured, false otherwise.
	 */
	isConfigured(): boolean;
}

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
	/** Iteration of the agent control loop the function was called TODO implement */
	iteration?: number;
	function_name: string; // underscore to match xml element name
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
