export interface LanguageTools {
	/**
	 * Creates an outline of the project that is suitable for RAG
	 */
	generateProjectMap(): Promise<string>;
}
