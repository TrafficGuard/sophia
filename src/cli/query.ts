import '#fastify/trace-init/trace-init'; // leave an empty line next so this doesn't get sorted from the first line

import { AgentLLMs } from '#agent/agentContextTypes';
import { RunAgentConfig } from '#agent/agentRunner';
import { runAgentWorkflow } from '#agent/agentWorkflowRunner';
import { shutdownTrace } from '#fastify/trace-init/trace-init';
import { Blueberry } from '#llm/multi-agent/blueberry';
import { ClaudeLLMs } from '#llm/services/anthropic';
import { ClaudeVertexLLMs } from '#llm/services/anthropic-vertex';
import { cerebrasLlama3_70b } from '#llm/services/cerebras';
import { deepseekChat } from '#llm/services/deepseek';
import { GPT4oMini, openAIo1, openAIo1mini } from '#llm/services/openai';
import { Gemini_1_5_Flash } from '#llm/services/vertexai';
import { codebaseQuery } from '#swe/discovery/codebaseQuery';
import { initFirestoreApplicationContext } from '../applicationContext';
import { parseProcessArgs, saveAgentId } from './cli';

async function main() {
	let agentLlms: AgentLLMs = ClaudeLLMs();
	if (process.env.GCLOUD_PROJECT) {
		await initFirestoreApplicationContext();
		agentLlms = ClaudeVertexLLMs();
	}
	// agentLlms.easy = Gemini_1_5_Flash();
	// agentLlms.medium = groqLlama3_1_70B();
	// agentLlms.medium = deepseekChat();
	// agentLlms.medium = openAIo1mini();
	// agentLlms.medium = GPT4oMini();
	// agentLlms.medium = new Blueberry();

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
