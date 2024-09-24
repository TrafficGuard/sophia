import { AgentLLMs } from '#agent/agentContextTypes';
import { LLM } from '#llm/llm';
import { anthropicLLMRegistry } from '#llm/models/anthropic';
import { anthropicVertexLLMRegistry } from '#llm/models/anthropic-vertex';
import { deepseekLLMRegistry } from '#llm/models/deepseek';
import { fireworksLLMRegistry } from '#llm/models/fireworks';
import { groqLLMRegistry } from '#llm/models/groq';
import { MockLLM, mockLLM } from '#llm/models/mock-llm';
import { ollamaLLMRegistry } from '#llm/models/ollama';
import { openAiLLMRegistry } from '#llm/models/openai';
import { togetherLLMRegistry } from '#llm/models/together';
import { vertexLLMRegistry } from '#llm/models/vertexai';
import { blueberryLLMRegistry } from '#llm/multi-agent/blueberry';
import { MultiLLM } from '#llm/multi-llm';
import { logger } from '#o11y/logger';

export const LLM_FACTORY: Record<string, () => LLM> = {
	...anthropicVertexLLMRegistry(),
	...anthropicLLMRegistry(),
	...fireworksLLMRegistry(),
	...groqLLMRegistry(),
	...openAiLLMRegistry(),
	...togetherLLMRegistry(),
	...vertexLLMRegistry(),
	...deepseekLLMRegistry(),
	...ollamaLLMRegistry(),
	...blueberryLLMRegistry(),
	...{ 'mock:mock': () => mockLLM },
};

export const LLM_TYPES: Array<{ id: string; name: string }> = Object.values(LLM_FACTORY)
	.map((factory) => factory())
	.map((llm) => {
		return { id: llm.getId(), name: llm.getDisplayName() };
	});

const REGISTRY_KEYS = Object.keys(LLM_FACTORY);

/**
 * @param llmId LLM identifier in the format service:model
 */
export function getLLM(llmId: string): LLM {
	// Check matching id first
	if (LLM_FACTORY[llmId]) {
		return LLM_FACTORY[llmId]();
	}
	// Check substring matching
	for (const key of REGISTRY_KEYS) {
		if (llmId.startsWith(key)) {
			return LLM_FACTORY[key]();
		}
	}
	if (llmId === 'multi:multi') {
		logger.warn('TODO MultiLLM deserialization not implemented');
		return new MultiLLM([], 0);
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
