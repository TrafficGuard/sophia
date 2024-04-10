/**
 * Gets an environment variable for a key, throwing an error if its nullish or empty
 * @param key
 */
export function envVar(key: string) {
	const value = process.env[key];
	if (value === undefined || value === null || value.trim() === '') throw new Error(`The environment variable ${key} is required`);
	return value;
}
