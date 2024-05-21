import { CreateLlmResponse, LlmRequest, LlmResponse, SystemPrompt } from '#llm/llmCallService/llmRequestResponse';
export interface CallerId {
	agentId?: string;
	userId?: string;
}

export interface LLMCall {
	request: LlmRequest;
	response: LlmResponse;
}

export interface LlmCallService {
	saveRequest(userPrompt: string, systemPrompt?: string, variationSourceId?: number, variationNote?: string): Promise<LlmRequest>;

	getRequest(llmRequestId: number): Promise<LlmRequest | null>;

	getSystemPromptByText(promptText: string): Promise<SystemPrompt | null>;

	saveResponse(requestId: number, caller: CallerId, llmResponse: CreateLlmResponse): Promise<string>;

	getResponse(llmResponseId: string): Promise<LlmResponse | null>;

	getLlmCallsForAgent(agentId: string): Promise<LLMCall[]>;
}
