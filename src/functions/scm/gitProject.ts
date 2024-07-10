export interface GitProject {
	id: number;
	name: string;
	description: string | null;
	defaultBranch: string;
	visibility: string;
	archived: boolean;
}
