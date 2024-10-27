import Cerebras from '@cerebras/cerebras_cloud_sdk';
import { CompletionCreateParams, CompletionCreateParamsNonStreaming } from '@cerebras/cerebras_cloud_sdk/src/resources/chat/completions';
import { addCost, agentContext } from '#agent/agentContextLocalStorage';
import { AgentLLMs } from '#agent/agentContextTypes';
import { LlmCall } from '#llm/llmCallService/llmCall';
import { logger } from '#o11y/logger';
import { withActiveSpan } from '#o11y/trace';
import { currentUser } from '#user/userService/userContext';
import { appContext } from '../../app';
import { RetryableError } from '../../cache/cacheRetry';
import { BaseLLM } from '../base-llm';
import { GenerateTextOptions, LLM, LlmMessage, combinePrompts } from '../llm';

import SystemMessageRequest = CompletionCreateParams.SystemMessageRequest;
import AssistantMessageRequest = CompletionCreateParams.AssistantMessageRequest;
import UserMessageRequest = CompletionCreateParams.UserMessageRequest;

export const CEREBRAS_SERVICE = 'cerebras';

export function cerebrasLLMRegistry(): Record<string, () => LLM> {
	return {
		'cerebras:llama3.1-8b': cerebrasLlama3_8b,
		'cerebras:llama3.1-70b': cerebrasLlama3_70b,
	};
}

export function cerebrasLlama3_8b(): LLM {
	return new CerebrasLLM(
		'LLaMA3 8b (Cerebras)',
		CEREBRAS_SERVICE,
		'llama3.1-8b',
		8_192,
		(input: string) => 0, //(input.length * 0.05) / (1_000_000 * 4),
		(output: string) => 0, //(output.length * 0.08) / (1_000_000 * 4),
		0,
		0,
	);
}

export function cerebrasLlama3_70b(): LLM {
	return new CerebrasLLM(
		'LLaMA3 70b (Cerebras)',
		CEREBRAS_SERVICE,
		'llama3.1-70b',
		8_192,
		(input: string) => 0, //(input.length * 0.05) / (1_000_000 * 4),
		(output: string) => 0, //(output.length * 0.08) / (1_000_000 * 4),
		0,
		0,
	);
}

export function cerebrasLLMs(): AgentLLMs {
	const llama70b = cerebrasLlama3_70b();
	return {
		easy: cerebrasLlama3_8b(),
		medium: llama70b,
		hard: llama70b,
		xhard: llama70b,
	};
}

/**
 * https://inference-docs.cerebras.ai/introduction
 */
export class CerebrasLLM extends BaseLLM {
	_client: Cerebras;

	constructor(
		displayName: string,
		service: string,
		model: string,
		maxInputTokens: number,
		/** Needed for Aider when we only have the text size */
		calculateInputCost: (input: string) => number,
		/** Needed for Aider when we only have the text size */
		calculateOutputCost: (output: string) => number,
		private costPerMillionInputTokens: number,
		private costPerMillionOutputTokens: number,
	) {
		super(displayName, service, model, maxInputTokens, calculateInputCost, calculateOutputCost);
	}

	client(): Cerebras {
		if (!this._client) {
			this._client = new Cerebras({
				apiKey: currentUser().llmConfig.cerebrasKey || process.env.CEREBRAS_API_KEY,
			});
		}
		return this._client;
	}

	async generateTextFromMessages(llmMessages: LlmMessage[], opts?: GenerateTextOptions): Promise<string> {
		return withActiveSpan(`generateTextFromMessages ${opts?.id ?? ''}`, async (span) => {
			const messages: Array<
				CompletionCreateParams.SystemMessageRequest | CompletionCreateParams.UserMessageRequest | CompletionCreateParams.AssistantMessageRequest
			> = llmMessages.map((msg) => {
				switch (msg.role) {
					case 'system': {
						const system: SystemMessageRequest = {
							role: 'system',
							content: msg.content as string,
						};
						return system;
					}
					case 'user': {
						const user: UserMessageRequest = {
							role: 'user',
							content: msg.content as string,
						};
						return user;
					}
					case 'assistant': {
						const assistant: AssistantMessageRequest = {
							role: 'assistant',
							content: msg.content as string,
						};
						return assistant;
					}
					default:
						throw new Error(`Unsupported role ${msg.role}`);
				}
			});

			span.setAttributes({
				model: this.model,
				service: this.service,
				caller: agentContext()?.callStack.at(-1) ?? '',
			});
			if (opts?.id) span.setAttribute('id', opts.id);

			const llmCallSave: Promise<LlmCall> = appContext().llmCallService.saveRequest({
				messages: llmMessages,
				llmId: this.getId(),
				agentId: agentContext()?.agentId,
				callStack: agentContext()?.callStack.join(' > '),
			});
			const requestTime = Date.now();

			try {
				const params: CompletionCreateParamsNonStreaming = {
					messages,
					model: this.model,
					temperature: opts?.temperature ?? undefined,
					top_p: opts?.topP ?? undefined,
					stop: opts?.stopSequences,
				};
				const completion = await this.client().chat.completions.create(params);

				const responseText = completion.choices[0]?.message?.content || '';
				const finishTime = Date.now();
				const llmCall: LlmCall = await llmCallSave;

				const inputTokens = completion.usage.prompt_tokens;
				const outputTokens = completion.usage.completion_tokens;
				const prompt = messages.map((m) => m.content).join('\n');
				const inputCost = this.calculateInputCost(prompt);
				const outputCost = this.calculateOutputCost(responseText);
				const cost = inputCost + outputCost;
				addCost(cost);

				llmCall.responseText = responseText;
				llmCall.timeToFirstToken = null;
				llmCall.totalTime = finishTime - requestTime;
				llmCall.cost = cost;
				llmCall.inputTokens = inputTokens;
				llmCall.outputTokens = outputTokens;

				span.setAttributes({
					inputTokens,
					outputTokens,
					response: responseText,
					inputCost: inputCost.toFixed(4),
					outputCost: outputCost.toFixed(4),
					cost: cost.toFixed(4),
					outputChars: responseText.length,
					callStack: agentContext()?.callStack.join(' > '),
				});

				try {
					await appContext().llmCallService.saveResponse(llmCall);
				} catch (e) {
					logger.error(e);
				}

				return responseText;
			} catch (e) {
				if (this.isRetryableError(e)) throw new RetryableError(e);
				throw e;
			}
		});
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
			span.setAttribute('userPrompt', userPrompt);
			span.setAttribute('inputChars', prompt.length);

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

			try {
				// https://inference-docs.cerebras.ai/api-reference/chat-completions
				const completion = await this.client().chat.completions.create({
					messages,
					model: this.model,
					temperature: opts?.temperature ?? undefined,
					top_p: opts?.topP ?? undefined,
					stop: opts?.stopSequences, // Cerebras uses 'stop' instead of 'stop_sequences'
				});
				const responseText = completion.choices[0]?.message?.content || '';

				const timeToFirstToken = Date.now() - requestTime;
				const finishTime = Date.now();
				const llmCall: LlmCall = await llmCallSave;

				const inputTokens = completion.usage.prompt_tokens;
				const outputTokens = completion.usage.completion_tokens;

				const inputCost = this.calculateInputCost(prompt);
				const outputCost = this.calculateOutputCost(responseText);
				const cost = inputCost + outputCost;
				addCost(cost);

				llmCall.responseText = responseText;
				llmCall.timeToFirstToken = timeToFirstToken;
				llmCall.totalTime = finishTime - requestTime;
				llmCall.cost = cost;

				try {
					await appContext().llmCallService.saveResponse(llmCall);
				} catch (e) {
					// queue to save
					console.error(e);
				}

				span.setAttributes({
					response: responseText,
					inputCost,
					outputCost,
					cost,
					outputChars: responseText.length,
				});

				return responseText;
			} catch (e) {
				// TODO find out the actual codes
				if (e.error?.code === 'rate_limit_exceeded') throw new RetryableError(e);
				throw e;
			}
		});
	}
}
