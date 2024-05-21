export function isNullish(value: any): boolean {
	return value === null || value === undefined;
}

export function isNotNullish(value: any): boolean {
	return value !== null && value !== undefined;
}
