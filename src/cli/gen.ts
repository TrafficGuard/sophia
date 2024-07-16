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

	const args = process.argv.slice(2);
	const initialPrompt = args.length > 0 ? args.join(' ') : readFileSync('src/cli/gen-in', 'utf-8');
	console.log(`Prompt: ${initialPrompt}`);

	const context: AgentContext = createContext({
		initialPrompt,
		agentName: 'chat',
		llms,
		functions: [],
	});
	agentContextStorage.enterWith(context);

	const text = await llms.medium.generateText(initialPrompt);

	writeFileSync('src/cli/gen-out', text);
	console.log(text);
	console.log('Wrote output to src/cli/gen-out');
}

main()
	.then(() => {
		console.log('done');
	})
	.catch((e) => {
		console.error(e);
	});
