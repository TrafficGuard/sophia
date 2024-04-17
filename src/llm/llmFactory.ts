import {ANTHROPIC_SERVICE, anthropicLLmFromModel} from "#llm/models/claude";
import {ANTHROPIC_VERTEX_SERVICE, anthropicVertexLLmFromModel} from "#llm/models/anthropic-vertex";
import {GROQ_SERVICE, groqLLmFromModel} from "#llm/models/groq";
import {OPENAI_SERVICE, openaiLLmFromModel} from "#llm/models/openai";
import {VERTEX_SERVICE, vertexLLmFromModel} from "#llm/models/vertexai";
import {LLM} from "#llm/llm";
import {AgentLLMs} from "#agent/agentContext";

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
        default:
            throw new Error('Unknown LLM service ' + obj.service);
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
