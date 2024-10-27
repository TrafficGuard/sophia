import { CreateLlmRequest, LlmCall } from '#llm/llmCallService/llmCall';

export interface CallerId {
	agentId?: string;
	userId?: string;
}

export interface LlmCallService {
	saveRequest(request: CreateLlmRequest): Promise<LlmCall>;

	saveResponse(llmCall: LlmCall): Promise<void>;

	getCall(llmCallId: string): Promise<LlmCall | null>;

	getLlmCallsForAgent(agentId: string): Promise<LlmCall[]>;
}
