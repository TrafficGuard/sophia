import { InvalidPromptError } from 'ai';
import OpenAI from 'openai';
import { addCost, agentContext } from '#agent/agentContextLocalStorage';
import { Perplexity } from '#functions/web/perplexity';
import { LlmCall } from '#llm/llmCallService/llmCall';
import { logger as log } from '#o11y/logger';
import { withSpan } from '#o11y/trace';
import { functionConfig } from '#user/userService/userContext';
import { envVar } from '#utils/env-var';
import { appContext } from '../../applicationContext';
import { BaseLLM } from '../base-llm';
import { GenerateTextOptions, LLM, LlmMessage } from '../llm';

export const PERPLEXITY_SERVICE = 'perplexity';

/*
https://docs.perplexity.ai/guides/pricing
Model	                            Price per 1000 requests	   Price per 1M tokens
llama-3.1-sonar-large-128k-online	$5	                       $1
llama-3.1-sonar-huge-128k-online	$5	                       $5
*/

export function perplexityLLMRegistry(): Record<string, () => LLM> {
	return {
		[`${PERPLEXITY_SERVICE}:sonar`]: perplexityLLM,
		[`${PERPLEXITY_SERVICE}:sonar-pro`]: perplexityProLLM,
	};
}

export function perplexityLLM(): LLM {
	return new PerplexityLLM(
		'Perplexity',
		'sonar',
		128000, // maxTokens
		0.000001, // costPerPromptToken ($1 per million tokens)
		0.000001, // costPerCompletionToken
		0.005, // onlineCost ($5 per 1000 requests)
	);
}

export function perplexityProLLM(): LLM {
	return new PerplexityLLM(
		'Perplexity Pro',
		'sonar-pro',
		128000, // maxTokens
		0.000005, // costPerPromptToken ($5 per million tokens)
		0.000005, // costPerCompletionToken
		0.005, // onlineCost ($5 per 1000 requests)
	);
}

export class PerplexityLLM extends BaseLLM {
	private openai: OpenAI;
	private costPerPromptToken: number;
	private costPerCompletionToken: number;
	private onlineCost: number;

	constructor(displayName: string, model: string, maxTokens: number, costPerPromptToken: number, costPerCompletionToken: number, onlineCost: number) {
		super(
			displayName,
			PERPLEXITY_SERVICE,
			model,
			maxTokens,
			(input: string) => input.length * costPerPromptToken,
			(output: string) => output.length * costPerCompletionToken,
		);
		this.costPerPromptToken = costPerPromptToken;
		this.costPerCompletionToken = costPerCompletionToken;
		this.onlineCost = onlineCost;
		this.openai = new OpenAI({
			apiKey: functionConfig(Perplexity).key || envVar('PERPLEXITY_KEY'),
			baseURL: 'https://api.perplexity.ai',
		});
	}

	isConfigured(): boolean {
		return Boolean(functionConfig(Perplexity).key || process.env.PERPLEXITY_KEY);
	}

	protected supportsGenerateTextFromMessages(): boolean {
		return true;
	}

	protected generateTextFromMessages(messages: LlmMessage[], opts?: GenerateTextOptions): Promise<string> {
		return withSpan(`generateText ${opts?.id ?? ''}`, async (span) => {
			// Perplexity only support string content, convert TextPart's to string, fail if any FilePart or ImagePart are found
			const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = messages.map((m) => {
				let content = '';
				if (typeof m.content === 'string') content = m.content;
				else {
					for (const item of m.content) {
						if (item.type === 'text') {
							content += item.text;
						} else {
							let mimeType = '<unknown>';
							if (item.type === 'file') mimeType = item.mimeType;
							if (item.type === 'image') mimeType = item.mimeType;
							throw new InvalidPromptError({ message: `Perplexity only support text messages. Messages contain ${mimeType}`, prompt: '' });
						}
					}
				}
				if (m.role !== 'user' && m.role !== 'assistant' && m.role !== 'system')
					throw new InvalidPromptError({ prompt: '', message: 'Only user, assistant and system roles are supported' });
				return {
					role: m.role,
					content: content,
				};
			});

			// Get system prompt and user prompt for logging
			const systemMessage = apiMessages.find((m) => m.role === 'system');
			const lastUserMessage = apiMessages.findLast((message) => message.role === 'user');

			if (systemMessage) span.setAttribute('systemPrompt', systemMessage.content as string);
			span.setAttributes({
				userPrompt: lastUserMessage?.content as string,
				inputChars: apiMessages.reduce((acc, m) => acc + (m.content as string).length, 0),
				model: this.model,
				service: this.service,
			});

			const llmCallSave: Promise<LlmCall> = appContext().llmCallService.saveRequest({
				userPrompt: lastUserMessage?.content as string,
				systemPrompt: systemMessage?.content as string,
				llmId: this.getId(),
				agentId: agentContext()?.agentId,
				callStack: this.callStack(agentContext()),
			});
			const requestTime = Date.now();

			try {
				const response = await this.openai.chat.completions.create({
					model: this.model,
					messages: apiMessages,
					stream: false,
				});

				const responseText = response.choices[0].message.content;

				const promptTokens = response.usage?.prompt_tokens ?? 0;
				const completionTokens = response.usage?.completion_tokens ?? 0;

				const timeToFirstToken = Date.now() - requestTime;
				const finishTime = Date.now();
				const llmCall: LlmCall = await llmCallSave;

				const cost = Number((promptTokens * this.costPerPromptToken + completionTokens * this.costPerCompletionToken + this.onlineCost).toFixed(6));
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
					timeToFirstToken,
					promptTokens,
					completionTokens,
					cost,
					outputChars: responseText.length,
				});

				return responseText;
			} catch (e) {
				log.error(e, `Perplexity error during generateTextFromMessages. Messages: ${JSON.stringify(messages)}`);
				throw e;
			}
		});
	}
}
