/**
 * Common interface between projects in GitLab, GitHub etc
 */
export interface GitProject {
	id: number;
	/** The project name */
	name: string;
	/** Group/organisation/user */
	namespace: string;
	/** The full path of the project with the namespace and name */
	fullPath: string;
	description: string | null;
	defaultBranch: string;
	visibility: string;
	archived: boolean;
	extra?: Record<string, any>;
}
