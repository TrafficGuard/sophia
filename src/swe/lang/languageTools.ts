export interface LanguageTools {
	/**
	 * Gets formatted string of the installed packages
	 */
	getInstalledPackages(): Promise<string>;

	/**
	 * Creates an outline of the project that is suitable for retrieval augmented generation
	 */
	generateProjectMap(): Promise<string>;

	/**
	 * Install a package using an available package manager
	 * @param packageName
	 */
	installPackage(packageName: string): Promise<void>;
}
