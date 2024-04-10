import { FileSystem } from '../../agent/filesystem';

/**
 * Source Code Management system (GitHub etc)
 */
export interface SourceControlManagement {
	getProjects(): Promise<any[]>;

	cloneProject(projectPathWithNamespace: string): Promise<string>;

	createMergeRequest(title: string, description: string): Promise<string>;
}
