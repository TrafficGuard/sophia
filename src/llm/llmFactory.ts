import { AgentLLMs } from '#agent/agentContext';
import { LLM } from '#llm/llm';
import { ANTHROPIC_VERTEX_SERVICE, anthropicVertexLLmFromModel } from '#llm/models/anthropic-vertex';
import { ANTHROPIC_SERVICE, anthropicLLmFromModel } from '#llm/models/claude';
import { GROQ_SERVICE, groqLLmFromModel } from '#llm/models/groq';
import { OPENAI_SERVICE, openaiLLmFromModel } from '#llm/models/openai';
import { TOGETHER_SERVICE, togetherLLmFromModel } from '#llm/models/together';
import { VERTEX_SERVICE, vertexLLmFromModel } from '#llm/models/vertexai';

export function llmFromJSON(obj: any): LLM {
	switch (obj.service) {
		case ANTHROPIC_SERVICE:
			return anthropicLLmFromModel(obj.model);
		case ANTHROPIC_VERTEX_SERVICE:
			return anthropicVertexLLmFromModel(obj.model);
		case GROQ_SERVICE:
			return groqLLmFromModel(obj.model);
		case OPENAI_SERVICE:
			return openaiLLmFromModel(obj.model);
		case VERTEX_SERVICE:
			return vertexLLmFromModel(obj.model);
		case TOGETHER_SERVICE:
			return togetherLLmFromModel(obj.model);
		default:
			throw new Error(`Unknown LLM service ${obj.service}`);
	}
}

export function deserializeLLMs(obj: any): AgentLLMs {
	return {
		easy: llmFromJSON(obj.easy),
		medium: llmFromJSON(obj.medium),
		hard: llmFromJSON(obj.hard),
		xhard: llmFromJSON(obj.xhard),
	};
}
