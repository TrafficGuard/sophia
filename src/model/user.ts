import { JiraConfig } from '#functions/jira';
import { GitHubConfig } from '#functions/scm/github';
import { GitLabConfig } from '#functions/scm/gitlab';

export interface LLMServicesConfig {
	anthropicKey: string;
	openaiKey: string;
	groqKey: string;
	togetheraiKey: string;
}

export interface User {
	id: string;
	email: string;
	enabled: boolean;

	hilBudget: number;
	hilCount: number;

	llmConfig: LLMServicesConfig;

	gitlabConfig: GitLabConfig;
	githubConfig: GitHubConfig;
	jiraConfig: JiraConfig;

	perplexityKey: string;

	// googleCustomSearchEngineId: string;
	// googleCustomSearchKey: string;
	// serpApiKey: string;

	// vertexProjectId: string;
	// vertexRegion: string;
	// anthropicVertexProjectId: string;
	// cloudMlRegion: string;
}
