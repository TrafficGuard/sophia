/**
 * Parse a string into an array. Handles JSON array and line seperated formatting.
 * @param paramValue
 */
export function parseArrayParameterValue(paramValue: string): string[] {
	paramValue = paramValue.trim();
	if (paramValue.startsWith('[')) {
		try {
			return JSON.parse(paramValue);
		} catch (e) {}
	}
	return paramValue
		.split('\n')
		.map((path) => path.trim())
		.filter((path) => path.length);
}
