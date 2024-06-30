import { readFileSync, writeFileSync } from 'fs';
import { LlmFunctions } from '#agent/LlmFunctions';
import { AgentContext, AgentLLMs, agentContextStorage, createContext } from '#agent/agentContext';
import '#fastify/trace-init/trace-init';
import { LLM } from '#llm/llm';
import { Claude3_Opus, Claude3_Sonnet } from '#llm/models/anthropic';
import { Claude3_5_Sonnet_Vertex, Claude3_Haiku_Vertex, Claude3_Opus_Vertex, Claude3_Sonnet_Vertex } from '#llm/models/anthropic-vertex';
import { Gemini_1_5_Experimental, Gemini_1_5_Pro } from '#llm/models/vertexai';

import { deepseekCoder } from '#llm/models/deepseek';
import { GPT4o } from '#llm/models/openai';
import { currentUser } from '#user/userService/userContext';

// Usage:
// npm run ai

const llm: LLM = Claude3_5_Sonnet_Vertex();
// llm = Claude3_Opus();
// llm = Gemini_1_5_Pro();
// llm = Gemini_1_5_Experimental();
// llm = Claude3_Haiku_Vertex();
// llm = Claude3_Opus_Vertex();
// llm = deepseekCoder();

const llms: AgentLLMs = {
	easy: llm,
	medium: llm,
	hard: llm,
	xhard: llm,
};

async function main() {
	writeFileSync('.nous/test', 'test');
	// const system = readFileSync('chat-system', 'utf-8');
	const prompt = readFileSync('src/cli/chat-in', 'utf-8');

	const context: AgentContext = createContext({
		initialPrompt: prompt,
		agentName: 'chat',
		llms,
		user: currentUser(),
		functions: new LlmFunctions(),
	});
	agentContextStorage.enterWith(context);

	const text = await llm.generateText(undefined, prompt);

	writeFileSync('src/cli/chat-out', text);
	console.log('wrote to chat-out');
}

main()
	.then(() => {
		console.log('done');
	})
	.catch((e) => {
		console.error(e);
	});
