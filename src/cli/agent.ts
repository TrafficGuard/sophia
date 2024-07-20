import '#fastify/trace-init/trace-init'; // leave an empty line next so this doesn't get sorted from the first line

import { startAgent } from '#agent/agentRunner';
import { FileSystem } from '#functions/storage/filesystem';
import { Perplexity } from '#functions/web/perplexity';
import { PublicWeb } from '#functions/web/web';
import { ClaudeLLMs } from '#llm/models/anthropic';
import { ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { logger } from '#o11y/logger';
import { CodeEditingAgent } from '#swe/codeEditingAgent';
import { SoftwareDeveloperAgent } from '#swe/softwareDeveloperAgent';
import { initFirestoreApplicationContext } from '../app';
import { parseProcessArgs, saveAgentId } from './cli';

export async function main() {
	let llms = ClaudeLLMs();
	if (process.env.GCLOUD_PROJECT) {
		await initFirestoreApplicationContext();
		llms = ClaudeVertexLLMs();
	}

	let functions: Array<any>;
	functions = [FileSystem, SoftwareDeveloperAgent, Perplexity, PublicWeb];
	functions = [CodeEditingAgent, Perplexity];

	const { initialPrompt, resumeAgentId } = parseProcessArgs();

	console.log(`Prompt: ${initialPrompt}`);

	const agentId = await startAgent({
		agentName: 'cli-agent',
		initialPrompt,
		functions,
		llms,
		type: 'python',
		resumeAgentId,
	});
	logger.info('AgentId ', agentId);

	saveAgentId('agent', agentId);
}

main().then(
	() => console.log('done'),
	(e) => console.error(e),
);
