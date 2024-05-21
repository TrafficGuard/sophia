import { randomUUID } from 'crypto';
import { CallerId, LLMCall, LlmCallService } from '#llm/llmCallService/llmCallService';
import { LlmRequest, LlmResponse, SystemPrompt } from '#llm/llmCallService/llmRequestResponse';

export class InMemoryLlmCallService implements LlmCallService {
	systemPromptStore = new Map<number, SystemPrompt>();
	llmRequestStore = new Map<number, LlmRequest>();
	llmResponseStore = new Map<string, LlmResponse>();

	async getSystemPrompt(id: number): Promise<SystemPrompt | null> {
		return this.systemPromptStore.get(id) || null;
	}

	async getSystemPromptText(id: number): Promise<string | null> {
		const prompt = this.systemPromptStore.get(id);
		return prompt ? prompt.text : null;
	}

	async saveSystemPrompt(text: string): Promise<void> {
		const id = this.generateId(text);
		this.systemPromptStore.set(id, { id, text });
	}

	private generateId(text: string): number {
		let hash = 0;
		for (let i = 0; i < text.length; i++) {
			const char = text.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash |= 0; // Convert to 32bit integer
		}
		return hash;
	}

	saveRequest(userPrompt: string, systemPrompt?: string, variationSourceId?: number, variationNote?: string): Promise<LlmRequest> {
		const hasSystemPrompt = systemPrompt?.trim().length > 0;
		let systemPromptObj: SystemPrompt = hasSystemPrompt ? this.systemPromptStore.get(promptId(systemPrompt)) : null;
		if (!systemPromptObj && hasSystemPrompt) {
			const id = promptId(systemPrompt);
			systemPromptObj = { id, text: systemPrompt };
			this.systemPromptStore.set(id, systemPromptObj);
		}
		const llmRequestId = promptId(systemPromptObj + userPrompt);
		let llmRequest: LlmRequest = this.llmRequestStore.get(llmRequestId);
		if (!llmRequest) {
			llmRequest = { userPromptText: userPrompt, id: llmRequestId, systemPromptId: systemPromptObj?.id };
		}
		this.llmRequestStore.set(llmRequestId, llmRequest);
		return Promise.resolve(llmRequest);
	}

	saveResponse(requestId: number, caller: CallerId, llmResponse: Omit<LlmResponse, 'id'>): Promise<string> {
		const id = randomUUID();
		const response: LlmResponse = { id, ...llmResponse };
		if (caller.userId) response.userId = caller.userId;
		if (caller.agentId) response.agentId = caller.agentId;

		this.llmResponseStore.set(id, response);
		return Promise.resolve(id);
	}

	getLlmCallsForAgent(agentId: string): Promise<LLMCall[]> {
		const responses = Array.from(this.llmResponseStore.values()).filter((response) => response.agentId === agentId);
		return Promise.resolve(
			responses.map((response) => {
				return { response, request: this.llmRequestStore.get(response.llmRequestId) };
			}),
		);
	}

	getSystemPromptByText(promptText: string): Promise<SystemPrompt | null> {
		return Promise.resolve(this.systemPromptStore.get(promptId(promptText)));
	}

	getRequest(llmRequestId: number): Promise<LlmRequest | null> {
		return Promise.resolve(this.llmRequestStore.get(llmRequestId));
	}

	getResponse(llmResponseId: string): Promise<LlmResponse | null> {
		return Promise.resolve(this.llmResponseStore.get(llmResponseId));
	}
}

/**
 * Returns a hash code from a string. Port of the Java string hashcode.
 * Used to calculate the id for a system prompt text
 * @param  {String} str The string to hash.
 * @return {Number}    A 32bit integer
 * @see http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
 */
function promptId(str: string): number {
	let hash = 0;
	for (let i = 0, len = str.length; i < len; i++) {
		const chr = str.charCodeAt(i);
		hash = (hash << 5) - hash + chr;
		hash |= 0; // Convert to 32bit integer
	}
	return hash;
}
