import { readFileSync, writeFileSync } from 'fs';
import { LlmFunctions } from '#agent/LlmFunctions';
import { AgentContext, AgentLLMs, agentContextStorage, createContext } from '#agent/agentContext';
import '#fastify/trace-init/trace-init';
import { LLM } from '#llm/llm';
import { Claude3_5_Sonnet_Vertex, ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';

import { ClaudeLLMs } from '#llm/models/anthropic';
import { currentUser } from '#user/userService/userContext';
import { initFirestoreApplicationContext } from '../app';

// Usage:
// npm run chat

async function main() {
	let llms = ClaudeLLMs();
	if (process.env.GCLOUD_PROJECT) {
		await initFirestoreApplicationContext();
		llms = ClaudeVertexLLMs();
	}

	const prompt = readFileSync('src/cli/chat-in', 'utf-8');

	const context: AgentContext = createContext({
		initialPrompt: readFileSync('src/cli/chat-in', 'utf-8'),
		agentName: 'chat',
		llms,
		functions: [],
	});
	agentContextStorage.enterWith(context);

	const text = await llms.medium.generateText(prompt);

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
