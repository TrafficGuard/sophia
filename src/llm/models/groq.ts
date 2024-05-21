import Groq from 'groq-sdk';
import { AgentLLMs, agentContext } from '#agent/agentContext';
import { addCost } from '#agent/agentContext';
import { CallerId } from '#llm/llmCallService/llmCallService';
import { CreateLlmResponse } from '#llm/llmCallService/llmRequestResponse';
import { withActiveSpan } from '#o11y/trace';
import { currentUser } from '#user/userService/userContext';
import { envVar } from '#utils/env-var';
import { appContext } from '../../app';
import { RetryableError } from '../../cache/cacheRetry';
import { BaseLLM } from '../base-llm';
import { LLM, combinePrompts, logDuration } from '../llm';
import { MultiLLM } from '../multi-llm';

export const GROQ_SERVICE = 'groq';

export function groqLLMRegistry(): Record<string, () => LLM> {
	return {
		'groq:mixtral-8x7b-32768': groqMixtral8x7b,
		'groq:gemma-7b-it': groqGemma7bIt,
		'groq:llama3-70b-8192': groqLlama3_70B,
	};
}

export function groqMixtral8x7b(): LLM {
	return new GroqLLM(GROQ_SERVICE, 'mixtral-8x7b-32768', 32_768, 0.27, 0.27);
}

export function groqGemma7bIt(): LLM {
	return new GroqLLM(GROQ_SERVICE, 'gemma-7b-it', 8_192, 0.1 / 1000000, 0.1 / 1000000);
}

export function groqLlama3_70B(): LLM {
	return new GroqLLM(GROQ_SERVICE, 'llama3-70b-8192', 8_192, 0.1 / 1000000, 0.1 / 1000000);
}

export function grokLLMs(): AgentLLMs {
	const mixtral = groqMixtral8x7b();
	return {
		easy: groqGemma7bIt(),
		medium: mixtral,
		hard: groqLlama3_70B(),
		xhard: new MultiLLM([mixtral, groqLlama3_70B()], 5),
	};
}

/**
 * https://wow.groq.com/
 */
export class GroqLLM extends BaseLLM {
	groq = new Groq({
		apiKey: currentUser().llmConfig.groqKey ?? envVar('GROQ_API_KEY'),
	});
	@logDuration
	async generateText(userPrompt: string, systemPrompt = ''): Promise<string> {
		return withActiveSpan('generateText', async (span) => {
			const prompt = combinePrompts(userPrompt, systemPrompt);
			if (systemPrompt) span.setAttribute('systemPrompt', systemPrompt);
			span.setAttributes({
				userPrompt,
				inputChars: prompt.length,
				model: this.model,
			});
			span.setAttribute('userPrompt', userPrompt);
			span.setAttribute('inputChars', prompt.length);

			const caller: CallerId = { agentId: agentContext().agentId };
			const llmRequestSave = appContext().llmCallService.saveRequest(userPrompt, systemPrompt);
			const requestTime = Date.now();

			try {
				const completion = await this.groq.chat.completions.create({
					messages: [
						{
							role: 'user',
							content: prompt,
						},
					],
					model: this.model,
				});
				const responseText = completion.choices[0]?.message?.content || '';

				const timeToFirstToken = Date.now();
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
				const outputCost = this.getOutputCostPerToken() * (completion.choices[0]?.message?.content || '').length;
				const cost = inputCost + outputCost;

				span.setAttributes({
					response: responseText,
					inputCost,
					outputCost,
					cost,
					outputChars: responseText.length,
				});
				addCost(cost);

				return responseText;
			} catch (e) {
				if (e.error?.code === 'rate_limit_exceeded') throw new RetryableError(e);
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
