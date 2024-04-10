export class MaxTokensError extends Error {
	constructor(
		public maxTokens: number,
		public responseContent: string,
	) {
		super(`Response exceeded the maximum token of ${maxTokens}`);
	}
}
