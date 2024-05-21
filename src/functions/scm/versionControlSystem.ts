/**
 * Version control system
 */
export interface VersionControlSystem {
	getDiff(): Promise<string>;

	getBranchDiff(): Promise<string>;

	createBranch(branchName: string): Promise<void>;

	switchToBranch(branchName: string): Promise<void>;

	getBranchName(): Promise<string>;

	/**
	 * Adds all files which are already tracked by version control to the index and commits
	 * @param commitMessage
	 */
	addAllTrackedAndCommit(commitMessage: string): Promise<void>;

	commit(commitMessage: string): Promise<void>;

	/**
	 * Gets the filenames which were added in the most recent commit
	 */
	getFilesAddedInHeadCommit(): Promise<string[]>;
}
