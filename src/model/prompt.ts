
export interface SystemPrompt {
    id: string
    text: string
}

export interface Prompt {
    id: string
    systemPrompt: SystemPrompt | undefined
    text: string
}

export interface LlmResponse {
    id: string
    prompt: Prompt
    model: string
    /** Time of the LLM request */
    requestTime: number
    /** Duration in millis until the first response from the LLM */
    firstResponse: number
    /** Duration in millis for the full response */
    totalTime: number
}
