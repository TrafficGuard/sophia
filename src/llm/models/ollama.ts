import axios from 'axios';
import { AgentLLMs, agentContext } from '#agent/agentContext';
import { CallerId } from '#llm/llmCallService/llmCallService';
import { CreateLlmResponse } from '#llm/llmCallService/llmRequestResponse';
import { withActiveSpan } from '#o11y/trace';
import { appContext } from '../../app';
import { BaseLLM } from '../base-llm';
import { GenerateTextOptions, LLM, combinePrompts, logTextGeneration } from '../llm';

export const OLLAMA_SERVICE = 'ollama';

export class OllamaLLM extends BaseLLM {
	constructor(name: string, model: string, maxInputTokens: number) {
		super(name, OLLAMA_SERVICE, model, maxInputTokens, 0, 0);
	}

	@logTextGeneration
	async generateText(userPrompt: string, systemPrompt?: string, opts?: GenerateTextOptions): Promise<string> {
		console.log('generateText');
		return withActiveSpan(`generateText ${opts?.id ?? ''}`, async (span) => {
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

			const url = `${process.env.OLLAMA_API_URL || 'http://localhost:11434'}/api/generate`;

			const response = await axios.post(url, {
				model: this.model,
				prompt: prompt,
				stream: false,
				options: {
					temperature: opts?.temperature ?? 1,
					top_p: opts?.topP,
				},
			});

			console.log(response);
			const responseText = response.data.response;
			const timeToFirstToken = Date.now() - requestTime;
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

			span.setAttributes({
				response: responseText,
				timeToFirstToken,
				outputChars: responseText.length,
			});

			return responseText;
		});
	}
}

export function Ollama_Qwen2_7b() {
	return new OllamaLLM('Qwen2 7B', 'qwen2:7b', 8192);
}

export function Ollama_Llama3_7b() {
	return new OllamaLLM('Llama3 7B', 'llama3:7b', 4096);
}

export function Ollama_CodeGemma_7b() {
	return new OllamaLLM('CodeGemma 7B', 'codegemma:7b', 8192);
}

export function Ollama_Phi3() {
	return new OllamaLLM('Phi3', 'phi3:latest', 2048);
}

export function Ollama_LLMs(): AgentLLMs {
	return {
		easy: Ollama_Phi3(),
		medium: Ollama_Phi3(),
		hard: Ollama_Llama3_7b(),
		xhard: Ollama_Llama3_7b(),
	};
}

export function ollamaLLMRegistry(): Record<string, () => LLM> {
	return {
		[`${OLLAMA_SERVICE}:qwen2:7b`]: Ollama_Qwen2_7b,
		[`${OLLAMA_SERVICE}:llama3:7b`]: Ollama_Llama3_7b,
		[`${OLLAMA_SERVICE}:codegemma:7b`]: Ollama_CodeGemma_7b,
		[`${OLLAMA_SERVICE}:phi3:latest`]: Ollama_Phi3,
	};
}
