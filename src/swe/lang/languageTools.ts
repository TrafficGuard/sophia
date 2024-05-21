export interface LanguageTools {
	/**
	 * Creates an outline of the project that is suitable for RAG
	 */
	generateProjectMap(): Promise<string>;

	/**
	 * Install a package using an available package manager
	 * @param packageName
	 */
	installPackage(packageName: string): Promise<void>;
}
