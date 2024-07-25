/**
 * Common interface between projects in GitLab, GitHub etc
 */
export interface GitProject {
	id: number;
	name: string;
	namespace: string;
	description: string | null;
	defaultBranch: string;
	visibility: string;
	archived: boolean;
	extra?: Record<string, any>;
}
