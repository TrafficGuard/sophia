import '#fastify/trace-init/trace-init'; // leave an empty line next so this doesn't get sorted from the first line

import { AgentLLMs } from '#agent/agentContextTypes';
import { RunAgentConfig } from '#agent/agentRunner';
import { runAgentWorkflow } from '#agent/agentWorkflowRunner';
import { shutdownTrace } from '#fastify/trace-init/trace-init';
import { ClaudeLLMs } from '#llm/models/anthropic';
import { ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { Gemini_1_5_Flash } from '#llm/models/vertexai';
import { buildSummaryDocs } from '#swe/documentationBuilder';
import { detectProjectInfo } from '#swe/projectDetection';
import { generateRepositoryMaps } from '#swe/repositoryMap';
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

	const maps = await generateRepositoryMaps(await detectProjectInfo());

	console.log(`languageProjectMap ${maps.languageProjectMap.tokens}`);
	console.log(`fileSystemTree ${maps.fileSystemTree.tokens}`);
	console.log(`folderSystemTreeWithSummaries ${maps.folderSystemTreeWithSummaries.tokens}`);
	console.log(`fileSystemTreeWithSummaries ${maps.fileSystemTreeWithSummaries.tokens}`);

	if (console.log) return;

	const agentId = await runAgentWorkflow(config, async () => {
		await buildSummaryDocs();
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
