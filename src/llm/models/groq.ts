import { WorkflowLLMs } from '../../agent/workflows';
import { addCost } from '../../agent/workflows';
import { RetryableError } from '../../cache/cache';
import { BaseLLM } from '../base-llm';
import { combinePrompts, logDuration } from '../llm';
import { MultiLLM } from '../multi-llm';

const Groq = require('groq-sdk');
const groq = new Groq({
	apiKey: process.env.GROQ_API_KEY,
});

export function grokWorkflowLLMs(): WorkflowLLMs {
	const mixtral = new GroqLLM('mixtral-8x7b-32768', 32_768, 0.27, 0.27);
	return {
		easy: new GroqLLM('gemma-7b-it', 8_192, 0.1 / 1000000, 0.1 / 1000000),
		medium: mixtral,
		hard: mixtral,
		xhard: new MultiLLM([mixtral], 5),
	};
}
/**
 * https://wow.groq.com/
 */
export class GroqLLM extends BaseLLM {
	@logDuration
	async generateText(userPrompt: string, systemPrompt = ''): Promise<string> {
		const prompt = combinePrompts(userPrompt, systemPrompt);
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
			const inputCost = this.getInputCostPerToken() * prompt.length;
			const outputCost = this.getOutputCostPerToken() * (completion.choices[0]?.message?.content || '').length;
			const totalCost = inputCost + outputCost;
			addCost(totalCost);
			return completion.choices[0]?.message?.content || '';
		} catch (e) {
			if (e.error?.code === 'rate_limit_exceeded') throw new RetryableError(e);
			throw e;
		}
	}
}

// error: {
// 	error: {
// 		message: 'Rate limit reached for model `mixtral-8x7b-32768` in organization `org_` on tokens per minute (TPM): Limit 18000, Used 0, Requested ~36313. Please try again in 1m1.043333333s. Visit https://console.groq.com/docs/rate-limits for more information.',
// 			type: 'tokens',
// 			code: 'rate_limit_exceeded'
// 	}
// }
