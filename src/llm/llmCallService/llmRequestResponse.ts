export interface LlmRequest {
	id: number;
	userPromptText: string;
	systemPromptId?: number;
	/** Hydrated from systemPromptId */
	systemPrompt?: SystemPrompt;

	variationSourceId?: number;
	variationNote?: string;
	/** Hydrated value from variationSourceId */
	variationSource?: LlmRequest;
}

// New fields need to be added in FirestoreLlmCallService.getLlmResponsesByAgentId
export interface LlmResponse {
	/** UUID */
	id: string;
	llmRequestId: number;
	/** Hydrated from llmRequestId */
	llmRequest?: LlmRequest;

	/** Populated when called by an agent */
	agentId?: string;
	/** Populated when called by a user through the UI */
	userId?: string;
	callStack?: string;
	responseText: string;
	/** LLM service/model identifier */
	llmId: string;
	/** Time of the LLM request */
	requestTime: number;
	/** Duration in millis until the first response from the LLM */
	timeToFirstToken: number;
	/** Duration in millis for the full response */
	totalTime: number;
}

export type CreateLlmResponse = Omit<LlmResponse, 'id'>;

export interface SystemPrompt {
	/** hash of the system prompt text */
	id: number;
	// description: string
	text: string;
	variationSourceId?: number;
	variationNote?: string;
	/** Hydrated value from variationSourceId */
	variationSource?: SystemPrompt;
}
