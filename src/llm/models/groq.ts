import { AgentLLMs, agentContext } from '#agent/agentContext';
import { addCost } from '#agent/agentContext';
import { withActiveSpan } from '#o11y/trace';
import { RetryableError } from '../../cache/cache';
import { BaseLLM } from '../base-llm';
import { LLM, combinePrompts, logDuration } from '../llm';
import { MultiLLM } from '../multi-llm';

const Groq = require('groq-sdk');
const groq = new Groq({
	apiKey: process.env.GROQ_API_KEY,
});

export function groqMixtral8x7b(): LLM {
	return new GroqLLM('groq', 'mixtral-8x7b-32768', 32_768, 0.27, 0.27);
}

export function groqGemma7bIt(): LLM {
	return new GroqLLM('groq', 'gemma-7b-it', 8_192, 0.1 / 1000000, 0.1 / 1000000);
}

export function grokLLMs(): AgentLLMs {
	const mixtral = groqMixtral8x7b();
	return {
		easy: groqGemma7bIt(),
		medium: mixtral,
		hard: mixtral,
		xhard: new MultiLLM([mixtral], 5),
	};
}

export const GROQ_SERVICE = 'groq';

export function groqLLmFromModel(model: string): LLM | null {
	// TODO groqLLmFromModel()
	// if (model.startsWith('claude-3-sonnet-')) return Claude3_Sonnet();
	// if (model.startsWith('claude-3-haiku-')) return Claude3_Haiku();
	// if (model.startsWith('claude-3-opus-')) return Claude3_Opus();
	return null;
}

/**
 * https://wow.groq.com/
 */
export class GroqLLM extends BaseLLM {
	@logDuration
	async generateText(userPrompt: string, systemPrompt = ''): Promise<string> {
		return withActiveSpan('generateText', async (span) => {
			const prompt = combinePrompts(userPrompt, systemPrompt);
			if (systemPrompt) span.setAttribute('systemPrompt', systemPrompt);
			span.setAttributes({
				userPrompt,
				inputChars: prompt.length,
				model: this.model,
				caller: agentContext().callStack.at(-1) ?? '',
			});
			span.setAttribute('userPrompt', userPrompt);
			span.setAttribute('inputChars', prompt.length);

			try {
				const completion = await groq.chat.completions.create({
					messages: [
						{
							role: 'user',
							content: prompt,
						},
					],
					model: this.model,
				});
				const response = completion.choices[0]?.message?.content || '';

				const inputCost = this.getInputCostPerToken() * prompt.length;
				const outputCost = this.getOutputCostPerToken() * (completion.choices[0]?.message?.content || '').length;
				const cost = inputCost + outputCost;

				span.setAttributes({
					response,
					inputCost,
					outputCost,
					cost,
					outputChars: response.length,
				});
				addCost(cost);

				return response;
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
