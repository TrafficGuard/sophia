// We don't want the actual CDATA tokens in the source code, as that would be problematic when we are using
// the framework to edit its own source code, so we'll break it up here for when we need to use it.
export const CDATA_START = '<![' + 'CDATA[';
export const CDATA_END = ']' + ']>';

export function needsCDATA(string: string): boolean {
	return string.includes('<') || string.includes('>');
}
