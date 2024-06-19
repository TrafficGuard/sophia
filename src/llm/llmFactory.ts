import { AgentLLMs } from '#agent/agentContext';
import { LLM } from '#llm/llm';
import { anthropicLLMRegistry } from '#llm/models/anthropic';
import { anthropicVertexLLMRegistry } from '#llm/models/anthropic-vertex';
import { fireworksLLMRegistry } from '#llm/models/fireworks';
import { groqLLMRegistry } from '#llm/models/groq';
import { openAiLLMRegistry } from '#llm/models/openai';
import { togetherLLMRegistry } from '#llm/models/together';
import { vertexLLMRegistry } from '#llm/models/vertexai';
import { deepseekLLMRegistry } from '#llm/models/deepseek';
import { deepseekLLMRegistry } from '#llm/models/deepseek';

export const LLM_REGISTRY: Record<string, () => LLM> = {
	...anthropicVertexLLMRegistry(),
	...anthropicLLMRegistry(),
	...fireworksLLMRegistry(),
	...groqLLMRegistry(),
	...openAiLLMRegistry(),
	...togetherLLMRegistry(),
	...vertexLLMRegistry(),
	...deepseekLLMRegistry(),
	...deepseekLLMRegistry(),
};

const REGISTRY_KEYS = Object.keys(LLM_REGISTRY);

/**
 * @param llmId LLM identifier in the format service:model
 */
export function getLLM(llmId: string): LLM {
	// Check matching id first
	if (LLM_REGISTRY[llmId]) {
		return LLM_REGISTRY[llmId]();
	}
	// Check substring matching
	for (const key of REGISTRY_KEYS) {
		if (llmId.startsWith(key)) {
			return LLM_REGISTRY[key]();
		}
	}
	throw new Error(`No LLM registered with id ${llmId}`);
}

export function deserializeLLMs(obj: any): AgentLLMs {
	return {
		easy: getLLM(obj.easy),
		medium: getLLM(obj.medium),
		hard: getLLM(obj.hard),
		xhard: getLLM(obj.xhard),
	};
}
