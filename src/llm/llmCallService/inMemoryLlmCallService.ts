import { randomUUID } from 'crypto';
import { CallerId, LlmCallService } from '#llm/llmCallService/llmCallService';
import { LlmRequest, LlmCall, CreateLlmRequest } from '#llm/llmCallService/llmCall';

export class InMemoryLlmCallService implements LlmCallService {
	llmCallStore = new Map<string, LlmCall>();

	async getCall(llmCallId: string): Promise<LlmCall | null> {
		return this.llmCallStore.get(llmCallId) || null;
	}

	async getLlmCallsForAgent(agentId: string): Promise<LlmCall[]> {
		return Array.from(this.llmCallStore.values()).filter(call => call.agentId === agentId);
	}

	async saveRequest(request: CreateLlmRequest): Promise<LlmCall> {
		const id = randomUUID();
		const requestTime = Date.now();
		const llmCall: LlmCall = {
			id,
			...request,
			requestTime
		};
		this.llmCallStore.set(id, llmCall);
		return llmCall;
	}

	async saveResponse(llmCall: LlmCall): Promise<void> {
		this.llmCallStore.set(llmCall.id, llmCall);
	}
}
