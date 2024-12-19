import { GroqProvider, createGroq } from '@ai-sdk/groq';
import Groq from 'groq-sdk';
import { agentContext } from '#agent/agentContextLocalStorage';
import { addCost } from '#agent/agentContextLocalStorage';
import { LlmCall } from '#llm/llmCallService/llmCall';
import { withActiveSpan } from '#o11y/trace';
import { currentUser } from '#user/userService/userContext';
import { envVar } from '#utils/env-var';
import { appContext } from '../../applicationContext';
import { RetryableError } from '../../cache/cacheRetry';
import { BaseLLM } from '../base-llm';
import { GenerateTextOptions, LLM, combinePrompts } from '../llm';

export const GROQ_SERVICE = 'groq';

export function groqLLMRegistry(): Record<string, () => LLM> {
	return {
		'groq:llama-3.3-70b-versatile': groqLlama3_3_70B,
	};
}

// Pricing and model ids at
// https://groq.com/pricing/
// https://console.groq.com/docs/models

export function groqLlama3_3_70B(): LLM {
	return new GroqLLM(
		'Llama3.3 70b (Groq)',
		GROQ_SERVICE,
		'llama-3.3-70b-versatile',
		131_072,
		(input: string) => (input.length * 0.59) / (1_000_000 * 4),
		(output: string) => (output.length * 0.79) / (1_000_000 * 4),
	);
}

/*
export class GroqLLM extends AiLLM<GroqProvider> {

	constructor(displayName: string, model: string, maxTokens: number, calculateInputCost: (input: string) => number, calculateOutputCost: (output: string) => number) {
		super(displayName, GROQ_SERVICE, model, maxTokens, calculateInputCost, calculateOutputCost);
	}

	protected apiKey(): string {
		return currentUser().llmConfig.groqKey || process.env.GROQ_API_KEY;
	}

	provider(): GroqProvider {
		if (!this.aiProvider) {
			this.aiProvider = createGroq({
				apiKey: this.apiKey() ?? '',
			});
		}
		return this.aiProvider;
	}
}
*/

/**
 * https://wow.groq.com/
 */
export class GroqLLM extends BaseLLM {
	_groq: Groq;

	groq(): Groq {
		if (!this._groq) {
			this._groq = new Groq({
				apiKey: currentUser().llmConfig.groqKey || envVar('GROQ_API_KEY'),
			});
		}
		return this._groq;
	}

	isConfigured(): boolean {
		return Boolean(currentUser().llmConfig.groqKey || process.env.GROQ_API_KEY);
	}

	async _generateText(systemPrompt: string | undefined, userPrompt: string, opts?: GenerateTextOptions): Promise<string> {
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
				callStack: this.callStack(agentContext()),
			});
			const requestTime = Date.now();

			try {
				const completion = await this.groq().chat.completions.create({
					messages: [
						{
							role: 'user',
							content: prompt,
						},
					],
					model: this.model,
				});
				const responseText = completion.choices[0]?.message?.content || '';

				const timeToFirstToken = Date.now() - requestTime;
				const finishTime = Date.now();
				const llmCall: LlmCall = await llmCallSave;

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
				if (e.error?.code === 'rate_limit_exceeded') throw new RetryableError(e);

				/*
				message: "429 {\"error\":{\"message\":\"Rate limit reached for model `llama-3.1-70b-versatile` in organization `org_01hrcrxd39e6ksnmqv6rydzy02` on tokens per minute (TPM): Limit 20000, Used 27280, Requested 9378. Please try again in 49.974s. Visit https://console.groq.com/docs/rate-limits for more information.\",\"type\":\"tokens\",\"code\":\"rate_limit_exceeded\"}}"
				err: {
				  "type": "RateLimitError",
				  "message": "429 {\"error\":{\"message\":\"Rate limit reached for model `llama-3.1-70b-versatile` in organization `org_01hrcrxd39e6ksnmqv6rydzy02` on tokens per minute (TPM): Limit 20000, Used 27280, Requested 9378. Please try again in 49.974s. Visit https://console.groq.com/docs/rate-limits for more information.\",\"type\":\"tokens\",\"code\":\"rate_limit_exceeded\"}}",
				  "stack":
					  Error: 429 {"error":{"message":"Rate limit reached for model `llama-3.1-70b-versatile` in organization `org_01hrcrxd39e6ksnmqv6rydzy02` on tokens per minute (TPM): Limit 20000, Used 27280, Requested 9378. Please try again in 49.974s. Visit https://console.groq.com/docs/rate-limits for more information.","type":"tokens","code":"rate_limit_exceeded"}}

				 */

				throw e;
			}
		});
	}
}

// error: {
// 	error: {
// 		message: 'Rate limit reached for model `mixtral-8x7b-32768` in organization `org_` on tokens per minute (TPM): Limit 18000, Used 0, Requested ~36313. Please try again in 1m1.043333333s. Visit https://console.groq.com/docs/rate-limits for more information.',
// 			type: 'tokens',
// 			code: 'rate_limit_exceeded'
// 	}
// }
