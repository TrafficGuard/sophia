import '#fastify/trace-init/trace-init'; // leave an empty line next so this doesn't get sorted from the first line

import { AgentLLMs } from '#agent/agentContextTypes';
import { RunAgentConfig } from '#agent/agentRunner';
import { runAgentWorkflow } from '#agent/agentWorkflowRunner';
import { shutdownTrace } from '#fastify/trace-init/trace-init';
import { ClaudeLLMs } from '#llm/models/anthropic';
import { Claude3_Sonnet_Vertex, ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { cerebrasLlama3_70b } from '#llm/models/cerebras';
import { deepseekChat } from '#llm/models/deepseek';
import { groqLlama3_1_70B } from '#llm/models/groq';
import { GPT4oMini, openAIo1, openAIo1mini } from '#llm/models/openai';
import { Gemini_1_5_Flash } from '#llm/models/vertexai';
import { codebaseQuery } from '#swe/codebaseQuery';
import { initFirestoreApplicationContext } from '../app';
import { parseProcessArgs, saveAgentId } from './cli';

async function main() {
	let agentLlms: AgentLLMs = ClaudeLLMs();
	if (process.env.GCLOUD_PROJECT) {
		await initFirestoreApplicationContext();
		agentLlms = ClaudeVertexLLMs();
	}
	// agentLlms.easy = Gemini_1_5_Flash();
	// agentLlms.medium = groqLlama3_1_70B();
	agentLlms.medium = deepseekChat();
	agentLlms.medium = openAIo1mini();
	agentLlms.medium = GPT4oMini();

	const { initialPrompt, resumeAgentId } = parseProcessArgs();

	console.log(`Prompt: ${initialPrompt}`);

	const config: RunAgentConfig = {
		agentName: `Query: ${initialPrompt}`,
		llms: agentLlms,
		functions: [], //FileSystem,
		initialPrompt,
		resumeAgentId,
		humanInLoop: {
			budget: 2,
		},
	};

	const agentId = await runAgentWorkflow(config, async () => {
		const response = await codebaseQuery(initialPrompt);
		console.log(response);
	});

	if (agentId) {
		saveAgentId('query', agentId);
	}

	await shutdownTrace();
}

main().then(
	() => console.log('done'),
	(e) => console.error(e),
);
