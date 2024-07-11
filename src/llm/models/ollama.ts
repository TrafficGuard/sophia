import axios from 'axios';
import { BaseLLM } from '../base-llm';
import { GenerateTextOptions, LLM, combinePrompts, logTextGeneration } from '../llm';
import { withActiveSpan } from '#o11y/trace';
import { addCost, agentContext } from '#agent/agentContext';
import { CallerId } from '#llm/llmCallService/llmCallService';
import { CreateLlmResponse } from '#llm/llmCallService/llmRequestResponse';
import { appContext } from '../../app';
import { envVar } from '#utils/env-var';

export const OLLAMA_SERVICE = 'ollama';

export class OllamaLLM extends BaseLLM {
  constructor(name: string, model: string, maxInputTokens: number, inputCostPerChar: number, outputCostPerChar: number) {
    super(name, OLLAMA_SERVICE, model, maxInputTokens, inputCostPerChar, outputCostPerChar);
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
      });

      const caller: CallerId = { agentId: agentContext().agentId };
      const llmRequestSave = appContext().llmCallService.saveRequest(userPrompt, systemPrompt);
      const requestTime = Date.now();

      try {
        const response = await axios.post(`${envVar('OLLAMA_API_URL', 'http://localhost:11434')}/api/generate`, {
          model: this.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: opts?.temperature ?? 1,
            top_p: opts?.topP,
          },
        });

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
      } catch (error) {
        span.recordException(error);
        throw error;
      }
    });
  }
}

export function Qwen2_7b() {
  return new OllamaLLM('Qwen2 7B', 'qwen2:7b', 8192, 0, 0);
}

export function Llama3_7b() {
  return new OllamaLLM('Llama3 7B', 'llama3:7b', 4096, 0, 0);
}

export function CodeGemma_7b() {
  return new OllamaLLM('CodeGemma 7B', 'codegemma:7b', 8192, 0, 0);
}

export function Phi3() {
  return new OllamaLLM('Phi3', 'phi3:latest', 2048, 0, 0);
}

export function ollamaLLMRegistry(): Record<string, () => LLM> {
  return {
    [`${OLLAMA_SERVICE}:qwen2:7b`]: Qwen2_7b,
    [`${OLLAMA_SERVICE}:llama3:7b`]: Llama3_7b,
    [`${OLLAMA_SERVICE}:codegemma:7b`]: CodeGemma_7b,
    [`${OLLAMA_SERVICE}:phi3:latest`]: Phi3,
  };
}
