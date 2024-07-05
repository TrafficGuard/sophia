/**
 * Version control system
 */
export interface VersionControlSystem {
	getBranchDiff(): Promise<string>;

	/**
	 * Gets the diff between the head commit and the provided commit, otherwise the previous commit
	 * @param commitSha the commit to get the diff from. Optional, defaults to the previous commit.
	 */
	getDiff(commitSha?: string): Promise<string>;

	createBranch(branchName: string): Promise<void>;

	switchToBranch(branchName: string): Promise<void>;

	getBranchName(): Promise<string>;

	/** @return the SHA value for the HEAD commit */
	getHeadSha(): Promise<string>;

	/**
	 * Adds all files which are already tracked by version control to the index and commits
	 * @param commitMessage
	 */
	addAllTrackedAndCommit(commitMessage: string): Promise<void>;

	commit(commitMessage: string): Promise<void>;

	/**
	 * Gets the filenames which were added in the most recent commit
	 * @param commitSha The commit to search back to, otherwise is for the HEAD commit.
	 * @return the filenames which were added
	 */
	getAddedFiles(commitSha?: string): Promise<string[]>;
}
