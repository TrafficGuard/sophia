import { llms } from '../agent/workflows';
import { BaseLLM } from './base-llm';
import { LLM } from './llm';

/*
https://news.ycombinator.com/item?id=39955725
https://arxiv.org/html/2402.05120v1

*/

/**
 * LLM implementation which calls multiple LLMs and selects the best result.
 * NOT YET TESTED
 */
export class MultiLLM extends BaseLLM {
	maxTokens: number;

	constructor(
		private llms: LLM[],
		private callsPerLLM = 1,
	) {
		super('multi', Math.min(...llms.map((llm) => llm.getMaxInputTokens())), 0, 0);
		this.maxTokens = Math.min(...llms.map((llm) => llm.getMaxInputTokens()));
	}

	async generateText(prompt: string, systemPrompt?: string): Promise<string> {
		const calls: Array<{ model: string; call: Promise<string> }> = [];
		for (const llm of this.llms) {
			for (let i = 0; i < this.callsPerLLM; i++) {
				calls.push({ model: llm.getModelName(), call: llm.generateText(prompt, systemPrompt) });
			}
		}
		const settled = await Promise.allSettled(calls.map((call) => call.call));
		const responses = settled.filter((result) => result.status === 'fulfilled').map((result) => (result as PromiseFulfilledResult<string>).value);

		const response = await llms().hard.generateTextWithResult(selectBestResponsePrompt(responses, prompt, systemPrompt));
		const index = Number.parseInt(response) - 1; // sub 1 as responses are indexed from 1 in the prompt
		console.log(`Best response was from ${calls[index].model}`);
		return responses[index];
	}

	getMaxInputTokens(): number {
		return this.maxTokens;
	}
}

function selectBestResponsePrompt(responses: string[], userPrompt: string, systemPrompt?: string): string {
	let prompt = systemPrompt ?? '';
	prompt += '<responses>\n';
	let i = 1;
	for (const result of responses) {
		prompt += `<response-${i}>\n${result}\n</response-${i++}>\n`;
	}
	prompt += '</responses>\n';
	prompt += `<input>\n${systemPrompt}${userPrompt}\n</input>\n`;
	prompt += '<task>Your task is to analyze multiple responses to an input prompt, and select the best response.\n';
	prompt += 'Provide a detailed analysis of each of the responses for correctness in facts, reasoning, and also for insightfullness to the <input/> block.\n';
	prompt += 'Then decide which response is the best, giving reasoning. The finally provide the number of the response. \n';
	prompt += 'The format of your answer MUST be as the following example within the formatting_example element:\n';
	prompt +=
		"<formatting_example>\n<analysis><response-1>Response 1 is reasonble because ....</response-1><response-2>Response 2 is good because of correctness [why...] and additional insight into ....</response-2><response-3>Reponse 3's logic is questionable because ...</response-3></analysis>\n<decision>Response 2 is the best because ...</decision>\n<result>2</result>\n</formatting_example>\n";
	prompt += '</task>';
	return prompt;
}

// TODO could have a prompt which merges the best from all responses
