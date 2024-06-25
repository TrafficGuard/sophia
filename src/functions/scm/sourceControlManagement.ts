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
	const functions = agentContext().functions;
	const scm = functions.getFunctionClasses().find((func) => typeof func.getProjects === 'function' && typeof func.cloneProject === 'function');
	if (!scm) {
		throw new Error(`A SourceControlManagement function class needs to be available. Could not find one in ${functions.getFunctionClassNames().join(',')}`);
	}
	return scm;
}
