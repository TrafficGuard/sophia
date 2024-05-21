import { agentContext } from '#agent/agentContext';

/**
 * Source Code Management system (GitHub, Gitlab, BitBucket etc)
 */
export interface SourceControlManagement {
	getProjects(): Promise<any[]>;

	cloneProject(projectPathWithNamespace: string): Promise<string>;

	createMergeRequest(title: string, description: string): Promise<string>;
	getJobLogs(projectPath: string, jobId: string): Promise<string>;
}

export function getSourceControlManagementTool(): SourceControlManagement {
	const toolbox = agentContext().toolbox;
	const scm = toolbox.getTools().find((tool) => typeof tool.getProjects === 'function' && typeof tool.cloneProject === 'function');
	if (!scm) {
		throw new Error(`A SourceControlManagement tool needs to be available. Could not find one in ${toolbox.getToolNames().join(',')}`);
	}
	return scm;
}
