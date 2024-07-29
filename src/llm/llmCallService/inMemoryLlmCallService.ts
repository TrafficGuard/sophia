import { randomUUID } from 'crypto';
import { CallerId, LlmCallService } from '#llm/llmCallService/llmCallService';
import {LlmRequest, LlmCall, CreateLlmRequest} from '#llm/llmCallService/llmCall';

export class InMemoryLlmCallService implements LlmCallService {
	llmCallStore = new Map<string, LlmCall>();

	getCall(llmCallId: string): Promise<LlmCall | null> {
		return Promise.resolve(undefined);
	}

	getLlmCallsForAgent(agentId: string): Promise<LlmCall[]> {
		return Promise.resolve([]);
	}

	saveRequest(request: CreateLlmRequest): Promise<LlmCall> {
		return Promise.resolve(undefined);
	}

	saveResponse(llmCall: LlmCall): Promise<string> {
		return Promise.resolve("");
	}

}
