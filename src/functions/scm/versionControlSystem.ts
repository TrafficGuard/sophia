/**
 * Version control system
 */
export interface VersionControlSystem {
	getBranchDiff(sourceBranch: string): Promise<string>;

	/**
	 * Gets the diff between the head commit and the provided commit, otherwise the previous commit
	 * @param commitSha the commit to get the diff from. Optional, defaults to the previous commit.
	 */
	getDiff(commitSha?: string): Promise<string>;

	/**
	 * Creates a new branch, or if it already exists then switches to it
	 * @param branchName
	 * @return if the branch was created, or false if switched to an existing one
	 */
	createBranch(branchName: string): Promise<boolean>;

	switchToBranch(branchName: string): Promise<void>;

	/** Pull the changes from the remote/origin server for the current branch */
	pull(): Promise<void>;

	/** Gets the current branch name */
	getBranchName(): Promise<string>;

	/** @return the SHA value for the HEAD commit */
	getHeadSha(): Promise<string>;

	/**
	 * Adds all files which are already tracked by version control to the index and commits
	 * @param commitMessage
	 */
	addAllTrackedAndCommit(commitMessage: string): Promise<void>;

	/**
	 * Merges the changes in specific files into the latest commit.
	 * This is useful for merging lint fixes and compiles fixes into the current commit, so that commit should build.
	 */
	mergeChangesIntoLatestCommit(files: string[]): Promise<void>;

	commit(commitMessage: string): Promise<void>;

	/**
	 * Gets the filenames which were added in the most recent commit
	 * @param commitSha The commit to search back to, otherwise is for the HEAD commit.
	 * @return the filenames which were added
	 */
	getAddedFiles(commitSha?: string): Promise<string[]>;
}
