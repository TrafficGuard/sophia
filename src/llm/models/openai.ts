import { OpenAI as OpenAISDK } from 'openai';
import { addCost, agentContext } from '#agent/agentContext';
import { CallerId } from '#llm/llmCallService/llmCallService';
import { CreateLlmResponse } from '#llm/llmCallService/llmRequestResponse';
import { withActiveSpan } from '#o11y/trace';
import { currentUser } from '#user/userService/userContext';
import { envVar } from '#utils/env-var';
import { appContext } from '../../app';
import { BaseLLM, GenerationMode } from '../base-llm';
import { LLM, combinePrompts, logTextGeneration } from '../llm';

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
	return new OpenAI('gpt-4-turbo-preview', 128_000, 10 / (1_000_000 * 4), 30 / (1_000_000 * 4));
}

export function GPT4o() {
	return new OpenAI('gpt-4o', 128_000, 5 / (1_000_000 * 4), 15 / (1_000_000 * 4));
}
export class OpenAI extends BaseLLM {
	openAISDK: OpenAISDK | null = null;

	constructor(model: Model, maxInputTokens: number, inputCostPerChar: number, outputCostPerChar: number) {
		super(OPENAI_SERVICE, model, maxInputTokens, inputCostPerChar, outputCostPerChar);
	}

	private sdk(): OpenAISDK {
		if (!this.openAISDK) {
			this.openAISDK = new OpenAISDK({
				apiKey: currentUser().llmConfig.openaiKey ?? envVar('OPENAI_API_KEY'),
			});
		}
		return this.openAISDK;
	}

	@logTextGeneration
	async generateText(userPrompt: string, systemPrompt: string, mode?: GenerationMode): Promise<string> {
		return withActiveSpan('generateText', async (span) => {
			const prompt = combinePrompts(userPrompt, systemPrompt);

			if (systemPrompt) span.setAttribute('systemPrompt', systemPrompt);
			span.setAttributes({
				userPrompt,
				inputChars: prompt.length,
				model: this.model,
			});

			const caller: CallerId = { agentId: agentContext().agentId };
			const llmRequestSave = appContext().llmCallService.saveRequest(userPrompt, systemPrompt);
			const requestTime = Date.now();

			const stream = await this.sdk().chat.completions.create({
				model: this.model,
				response_format: { type: mode === 'json' ? 'json_object' : 'text' },
				messages: [{ role: 'user', content: prompt }],
				stream: true,
			});
			let responseText = '';
			let timeToFirstToken = null;
			for await (const chunk of stream) {
				responseText += chunk.choices[0]?.delta?.content || '';
				if (!timeToFirstToken) timeToFirstToken = Date.now();
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
