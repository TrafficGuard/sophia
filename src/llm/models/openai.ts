import { OpenAIChatModelId } from '@ai-sdk/openai/internal';
import { OpenAI as OpenAISDK } from 'openai';
import { addCost, agentContext } from '#agent/agentContextLocalStorage';
import { LlmCall } from '#llm/llmCallService/llmCall';
import { logger } from '#o11y/logger';
import { withActiveSpan } from '#o11y/trace';
import { currentUser } from '#user/userService/userContext';
import { envVar } from '#utils/env-var';
import { appContext } from '../../app';
import { BaseLLM } from '../base-llm';
import { GenerateTextOptions, LLM, combinePrompts } from '../llm';

export const OPENAI_SERVICE = 'openai';

export function openAiLLMRegistry(): Record<string, () => LLM> {
	return {
		'openai:gpt-4o': () => openaiLLmFromModel('gpt-4o'),
		'openai:gpt-4o-mini': () => openaiLLmFromModel('gpt-4o-mini'),
		'openai:o1-preview': () => openaiLLmFromModel('o1-preview'),
		'openai:o1-mini': () => openaiLLmFromModel('o1-mini'),
	};
}

type Model = 'gpt-4o' | 'gpt-4o-mini' | 'o1-preview' | 'o1-mini';

export function openaiLLmFromModel(model: string): LLM {
	if (model.startsWith('gpt-4o-mini')) return GPT4oMini();
	if (model.startsWith('gpt-4o')) return GPT4o();
	if (model.startsWith('o1-preview')) return openAIo1();
	if (model.startsWith('o1-mini')) return openAIo1mini();
	throw new Error(`Unsupported ${OPENAI_SERVICE} model: ${model}`);
}

export function openAIo1() {
	return new OpenAI(
		'OpenAI o1',
		'o1-preview',
		'o1-preview',
		128_000,
		(input: string) => (input.length * 15) / 1_000_000,
		(output: string) => (output.length * 60) / (1_000_000 * 4),
	);
}

export function openAIo1mini() {
	return new OpenAI(
		'OpenAI o1-mini',
		'o1-mini',
		'o1-mini',
		128_000,
		(input: string) => (input.length * 3) / 1_000_000,
		(output: string) => (output.length * 12) / (1_000_000 * 4),
	);
}

export function GPT4o() {
	return new OpenAI(
		'GPT4o',
		'gpt-4o',
		'gpt-4o',
		128_000,
		(input: string) => (input.length * 2.5) / 1_000_000,
		(output: string) => (output.length * 10) / (1_000_000 * 4),
	);
}

export function GPT4oMini() {
	return new OpenAI(
		'GPT4o mini',
		'gpt-4o-mini',
		'gpt-4o-mini',
		128_000,
		(input: string) => (input.length * 0.15) / (1_000_000 * 4),
		(output: string) => (output.length * 0.6) / (1_000_000 * 4),
	);
}

export class OpenAI extends BaseLLM {
	openAISDK: OpenAISDK | null = null;

	constructor(
		name: string,
		model: Model,
		aiModel: OpenAIChatModelId,
		maxInputTokens: number,
		calculateInputCost: (input: string) => number,
		calculateOutputCost: (output: string) => number,
	) {
		super(name, OPENAI_SERVICE, model, maxInputTokens, calculateInputCost, calculateOutputCost);
	}

	private sdk(): OpenAISDK {
		if (!this.openAISDK) {
			this.openAISDK = new OpenAISDK({
				apiKey: currentUser().llmConfig.openaiKey || envVar('OPENAI_API_KEY'),
			});
		}
		return this.openAISDK;
	}

	isConfigured(): boolean {
		return Boolean(currentUser().llmConfig.openaiKey || process.env.OPENAI_API_KEY);
	}

	async generateImage(description: string): Promise<string> {
		const response = await this.sdk().images.generate({
			model: 'dall-e-3',
			prompt: description,
			n: 1,
			size: '1792x1024',
		});
		const imageUrl = response.data[0].url;
		logger.info(`Generated image at ${imageUrl}`);
		// await getFileSystem().writeFile('', imageUrl, 'utf8');
		return imageUrl;
	}

	async generateText(userPrompt: string, systemPrompt?: string, opts?: GenerateTextOptions): Promise<string> {
		return withActiveSpan(`generateText ${opts?.id ?? ''}`, async (span) => {
			const prompt = combinePrompts(userPrompt, systemPrompt);

			if (systemPrompt) span.setAttribute('systemPrompt', systemPrompt);
			span.setAttributes({
				userPrompt,
				inputChars: prompt.length,
				model: this.model,
				service: this.service,
			});

			const llmCallSave: Promise<LlmCall> = appContext().llmCallService.saveRequest({
				userPrompt,
				systemPrompt,
				llmId: this.getId(),
				agentId: agentContext()?.agentId,
				callStack: agentContext()?.callStack.join(' > '),
			});
			const requestTime = Date.now();

			const messages = [];
			if (systemPrompt) {
				messages.push({
					role: 'system',
					content: systemPrompt,
				});
			}
			messages.push({
				role: 'user',
				content: userPrompt,
			});

			const stream = await this.sdk().chat.completions.create({
				model: this.model,
				response_format: { type: opts?.type === 'json' ? 'json_object' : 'text' },
				messages,
				stream: true,
			});
			let responseText = '';
			let timeToFirstToken = null;
			for await (const chunk of stream) {
				responseText += chunk.choices[0]?.delta?.content || '';
				if (!timeToFirstToken) timeToFirstToken = Date.now() - requestTime;
			}
			const finishTime = Date.now();

			const llmCall: LlmCall = await llmCallSave;

			const inputCost = this.calculateInputCost(prompt);
			const outputCost = this.calculateOutputCost(responseText);
			const cost = inputCost + outputCost;

			llmCall.responseText = responseText;
			llmCall.timeToFirstToken = timeToFirstToken;
			llmCall.totalTime = finishTime - requestTime;
			llmCall.cost = cost;
			addCost(cost);

			span.setAttributes({
				inputChars: prompt.length,
				outputChars: responseText.length,
				response: responseText,
				inputCost,
				outputCost,
				cost,
			});

			try {
				await appContext().llmCallService.saveResponse(llmCall);
			} catch (e) {
				// queue to save
				logger.error(e);
			}

			return responseText;
		});
	}
}
