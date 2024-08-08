import { CodeReviewConfig } from '#swe/codeReview/codeReviewModel';

export interface CodeReviewService {
	getCodeReviewConfig(id: string): Promise<CodeReviewConfig | null>;

	listCodeReviewConfigs(): Promise<CodeReviewConfig[]>;

	createCodeReviewConfig(config: Omit<CodeReviewConfig, 'id'>): Promise<string>;

	updateCodeReviewConfig(id: string, config: Partial<CodeReviewConfig>): Promise<void>;

	deleteCodeReviewConfig(id: string): Promise<void>;
}
