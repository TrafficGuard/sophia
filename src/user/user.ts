export interface LLMServicesConfig {
	vertexProjectId?: string;
	vertexRegion?: string;

	anthropicKey?: string;
	openaiKey?: string;
	groqKey?: string;
	togetheraiKey?: string;
	deepseekKey?: string;
	fireworksKey?: string;
	cerebrasKey?: string;
}

export interface User {
	id: string;
	email: string;
	enabled: boolean;

	hilBudget: number;
	hilCount: number;

	llmConfig: LLMServicesConfig;

	/** Configuration for the function callable integrations */
	functionConfig: Record<string, Record<string, any>>;
}
