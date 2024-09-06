import '#fastify/trace-init/trace-init'; // leave an empty line next so this doesn't get sorted from the first line

import { AgentLLMs } from '#agent/agentContextTypes';
import { RunAgentConfig } from '#agent/agentRunner';
import { runAgentWorkflow } from '#agent/agentWorkflowRunner';
import { shutdownTrace } from '#fastify/trace-init/trace-init';
import { ClaudeLLMs } from '#llm/models/anthropic';
import { ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { Gemini_1_5_Flash } from '#llm/models/vertexai';
import { buildDocs } from '#swe/documentationBuilder';
import { detectProjectInfo } from '#swe/projectDetection';
import { generateProjectMaps } from '#swe/projectMap';
import { initFirestoreApplicationContext } from '../app';
import { parseProcessArgs, saveAgentId } from './cli';

async function main() {
	let agentLlms: AgentLLMs = ClaudeLLMs();
	if (process.env.GCLOUD_PROJECT) {
		await initFirestoreApplicationContext();
		agentLlms = ClaudeVertexLLMs();
	}
	agentLlms.easy = Gemini_1_5_Flash();

	const { initialPrompt, resumeAgentId } = parseProcessArgs();

	console.log(`Prompt: ${initialPrompt}`);

	const config: RunAgentConfig = {
		agentName: 'docs',
		llms: agentLlms,
		functions: [], //FileSystem,
		initialPrompt,
		resumeAgentId,
		humanInLoop: {
			budget: 2,
		},
	};

	const agentId = await runAgentWorkflow(config, async () => {
		// await buildDocs()
		await generateProjectMaps((await detectProjectInfo())[0]);
		if (console.log) return;
	});

	if (agentId) {
		saveAgentId('docs', agentId);
	}

	await shutdownTrace();
}

main().then(
	() => console.log('done'),
	(e) => console.error(e),
);
