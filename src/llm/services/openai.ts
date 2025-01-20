import { OpenAIProvider, createOpenAI } from '@ai-sdk/openai';
import { AiLLM } from '#llm/services/ai-llm';
import { logger } from '#o11y/logger';
import { currentUser } from '#user/userService/userContext';
import { GenerateTextOptions, LLM, LlmMessage } from '../llm';

export const OPENAI_SERVICE = 'openai';

export function openAiLLMRegistry(): Record<string, () => LLM> {
	return {
		'openai:gpt-4o': () => openaiLLmFromModel('gpt-4o'),
		'openai:gpt-4o-mini': () => openaiLLmFromModel('gpt-4o-mini'),
		'openai:o1-preview': () => openaiLLmFromModel('o1-preview'),
		'openai:o1-mini': () => openaiLLmFromModel('o1-mini'),
	};
}

export function openaiLLmFromModel(model: string): LLM {
	if (model.startsWith('gpt-4o-mini')) return GPT4oMini();
	if (model.startsWith('gpt-4o')) return GPT4o();
	if (model.startsWith('o1-preview')) return openAIo1();
	if (model.startsWith('o1-mini')) return openAIo1mini();
	throw new Error(`Unsupported ${OPENAI_SERVICE} model: ${model}`);
}

export function openAIo1() {
	return new OpenAI(
		'OpenAI o1 preview',
		'o1-preview',
		(input: string) => (input.length * 15) / 1_000_000,
		(output: string) => (output.length * 60) / (1_000_000 * 4),
	);
}

export function openAIo1mini() {
	return new OpenAI(
		'OpenAI o1-mini',
		'o1-mini',
		(input: string) => (input.length * 3) / 1_000_000,
		(output: string) => (output.length * 12) / (1_000_000 * 4),
	);
}

export function GPT4o() {
	return new OpenAI(
		'GPT4o',
		'gpt-4o',
		(input: string) => (input.length * 2.5) / 1_000_000,
		(output: string) => (output.length * 10) / (1_000_000 * 4),
	);
}

export function GPT4oMini() {
	return new OpenAI(
		'GPT4o mini',
		'gpt-4o-mini',
		(input: string) => (input.length * 0.15) / (1_000_000 * 4),
		(output: string) => (output.length * 0.6) / (1_000_000 * 4),
	);
}

export class OpenAI extends AiLLM<OpenAIProvider> {
	constructor(displayName: string, model: string, calculateInputCost: (input: string) => number, calculateOutputCost: (output: string) => number) {
		super(displayName, OPENAI_SERVICE, model, 128_000, calculateInputCost, calculateOutputCost);
	}

	protected apiKey(): string {
		return currentUser().llmConfig.openaiKey || process.env.OPENAI_API_KEY;
	}

	provider(): OpenAIProvider {
		if (!this.aiProvider) {
			this.aiProvider = createOpenAI({
				apiKey: this.apiKey(),
			});
		}
		return this.aiProvider;
	}

	async generateTextFromMessages(llmMessages: LlmMessage[], opts?: GenerateTextOptions): Promise<string> {
		if (this.getModel().startsWith('o1-')) {
			if (opts?.stopSequences) {
				opts.stopSequences = undefined;
			}
			if (llmMessages[0].role === 'system') {
				const systemPrompt = llmMessages.shift().content;
				const userPrompt = llmMessages[0].content;
				if (typeof systemPrompt !== 'string' || typeof userPrompt !== 'string')
					throw new Error('System prompt and first user message must be only string content when using o1 models, as system prompts are not supported');
				llmMessages[0].content = `Always follow the system prompt instructions when replying:\n<system-prompt>\n${systemPrompt}\n</system-prompt>\n\n${userPrompt}`;
			}
		}

		return super.generateTextFromMessages(llmMessages, opts);
	}

	// async generateImage(description: string): Promise<string> {
	// 	const response = await this.sdk().images.generate({
	// 		model: 'dall-e-3',
	// 		prompt: description,
	// 		n: 1,
	// 		size: '1792x1024',
	// 	});
	// 	const imageUrl = response.data[0].url;
	// 	logger.info(`Generated image at ${imageUrl}`);
	// 	// await getFileSystem().writeFile('', imageUrl, 'utf8');
	// 	return imageUrl;
	// }
}
