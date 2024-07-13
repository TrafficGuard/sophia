import { AgentLLMs, addCost, agentContext } from '#agent/agentContext';
import { CallerId } from '#llm/llmCallService/llmCallService';
import { CreateLlmResponse } from '#llm/llmCallService/llmRequestResponse';
import { logger } from '#o11y/logger';
import { withActiveSpan } from '#o11y/trace';
import { appContext } from '../../app';
import { BaseLLM } from '../base-llm';
import { GenerateTextOptions, combinePrompts, logTextGeneration } from '../llm';

export function mockLLMs(): AgentLLMs {
	return {
		easy: new MockLLM(),
		medium: new MockLLM(),
		hard: new MockLLM(),
		xhard: new MockLLM(),
	};
}

export class MockLLM extends BaseLLM {
	lastPrompt = '';
	/**
	 * @param responses The responses to generateText()
	 * @param maxInputTokens defaults to 100
	 */
	constructor(
		private responses: string[] = [],
		maxInputTokens = 100000,
	) {
		super('mock', 'mock', 'mock', maxInputTokens, 1 / 1_000_000, 1 / 1_000_000);
	}

	setResponse(response: string) {
		this.responses = [response];
	}

	setResponses(responses: string[]) {
		this.responses = responses;
	}

	addResponse(response: string) {
		this.responses.push(response);
	}

	getLastPrompt(): string {
		if (!this.lastPrompt) throw new Error('No calls yet');
		return this.lastPrompt;
	}

	@logTextGeneration
	async generateText(userPrompt: string, systemPrompt?: string, opts?: GenerateTextOptions): Promise<string> {
		if (opts?.id) logger.info(`MockLLM ${opts.id}`);
		return withActiveSpan('generateText', async (span) => {
			const prompt = combinePrompts(userPrompt, systemPrompt);
			this.lastPrompt = prompt;
			if (systemPrompt) span.setAttribute('systemPrompt', systemPrompt);
			span.setAttributes({
				userPrompt,
				inputChars: prompt.length,
				model: this.model,
			});

			if (this.responses.length === 0) throw new Error('Need to call setResponses on MockLLM before calling generateText');

			const caller: CallerId = { agentId: agentContext().agentId };
			const llmRequestSave = appContext().llmCallService.saveRequest(userPrompt, systemPrompt);
			const requestTime = Date.now();

			// remove the first items from this.responses
			const responseText = this.responses.shift();

			const timeToFirstToken = 1;
			const finishTime = Date.now();
			const llmRequest = await llmRequestSave;
			const llmResponse: CreateLlmResponse = {
				llmId: this.getId(),
				llmRequestId: llmRequest.id,
				responseText,
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
				response: responseText,
				timeToFirstToken,
				inputCost,
				outputCost,
				cost,
				outputChars: responseText.length,
			});

			addCost(cost);

			return responseText;
		});
	}
}
