import { OpenAI as OpenAISDK } from 'openai';
import { addCost, agentContext, getFileSystem } from '#agent/agentContext';
import { CallerId } from '#llm/llmCallService/llmCallService';
import { CreateLlmResponse } from '#llm/llmCallService/llmRequestResponse';
import { logger } from '#o11y/logger';
import { withActiveSpan } from '#o11y/trace';
import { currentUser } from '#user/userService/userContext';
import { envVar } from '#utils/env-var';
import { appContext } from '../../app';
import { BaseLLM } from '../base-llm';
import { GenerateTextOptions, LLM, combinePrompts, logTextGeneration } from '../llm';

// https://platform.openai.com/docs/models/gpt-4-and-gpt-4-turbo
export const OPENAI_SERVICE = 'openai';

export function openAiLLMRegistry(): Record<string, () => LLM> {
	return {
		'openai:gpt-4-turbo-preview': () => openaiLLmFromModel('gpt-4-turbo'),
		'openai:gpt-4o': () => openaiLLmFromModel('gpt-4o'),
	};
}

type Model = 'gpt-4o' | 'gpt-4-turbo-preview' | 'gpt-4-vision-preview' | 'gpt-4' | 'gpt-4-32k' | 'gpt-3.5-turbo' | 'gpt-3.5-turbo-16k';

export function openaiLLmFromModel(model: string): LLM {
	if (model.startsWith('gpt-4-turbo')) return GPT4();
	if (model.startsWith('gpt-4o')) return GPT4o();
	throw new Error(`Unsupported ${OPENAI_SERVICE} model: ${model}`);
}

// 1 token ~= 4 chars
export function GPT4() {
	return new OpenAI('GPT4-turbo', 'gpt-4-turbo-preview', 128_000, 10 / (1_000_000 * 4), 30 / (1_000_000 * 4));
}

export function GPT4o() {
	return new OpenAI('GPT4o', 'gpt-4o', 128_000, 5 / (1_000_000 * 4), 15 / (1_000_000 * 4));
}

export class OpenAI extends BaseLLM {
	openAISDK: OpenAISDK | null = null;

	constructor(name, model: Model, maxInputTokens: number, inputCostPerChar: number, outputCostPerChar: number) {
		super(name, OPENAI_SERVICE, model, maxInputTokens, inputCostPerChar, outputCostPerChar);
	}

	private sdk(): OpenAISDK {
		if (!this.openAISDK) {
			this.openAISDK = new OpenAISDK({
				apiKey: currentUser().llmConfig.openaiKey ?? envVar('OPENAI_API_KEY'),
			});
		}
		return this.openAISDK;
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

	@logTextGeneration
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

			const caller: CallerId = { agentId: agentContext().agentId };
			const llmRequestSave = appContext().llmCallService.saveRequest(userPrompt, systemPrompt);
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
				response_format: { type: opts.type === 'json' ? 'json_object' : 'text' },
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

			const llmRequest = await llmRequestSave;
			const llmResponse: CreateLlmResponse = {
				llmId: this.getId(),
				llmRequestId: llmRequest.id,
				responseText: responseText,
				requestTime,
				timeToFirstToken: timeToFirstToken,
				totalTime: finishTime - requestTime,
				callStack: agentContext().callStack.join(' > '),
			};
			await appContext().llmCallService.saveResponse(llmRequest.id, caller, llmResponse);

			const inputCost = this.getInputCostPerToken() * prompt.length;
			const outputCost = this.getOutputCostPerToken() * responseText.length;
			const cost = inputCost + outputCost;
			span.setAttributes({
				inputChars: prompt.length,
				outputChars: responseText.length,
				response: responseText,
				inputCost,
				outputCost,
				cost,
			});

			addCost(cost);

			return responseText;
		});
	}
}
