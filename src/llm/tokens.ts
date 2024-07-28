import { createByModelName } from '@microsoft/tiktokenizer';

export async function countTokens(text: string): Promise<number> {
	const tokenizer = await createByModelName('gpt-4o');
	return tokenizer.encode(text).length;
}
