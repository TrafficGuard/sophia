/**
 * Source Code Management system (GitHub, Gitlab, BitBucket etc)
 */
export interface SourceControlManagement {
	getProjects(): Promise<any[]>;

	cloneProject(projectPathWithNamespace: string): Promise<string>;

	createMergeRequest(title: string, description: string): Promise<string>;
}
