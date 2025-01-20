export interface GenerateOptions {
    /** Temperature controls randomness in token selection (0-2) */
    temperature?: number;
    /** Top P controls diversity via nucleus sampling (0-1) */
    topP?: number;
    topK?: number;
    /** Presence penalty reduces repetition (-2.0 to 2.0) */
    presencePenalty?: number;
    /** Frequency penalty reduces repetition (-2.0 to 2.0) */
    frequencyPenalty?: number;
}

export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    status?: string;

    chat?: GenerateOptions & {
        enabledLLMs: Record<string, boolean>;
        defaultLLM: string;
    };
}
