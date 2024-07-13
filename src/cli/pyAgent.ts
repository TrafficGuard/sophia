import '#fastify/trace-init/trace-init';

import { readFileSync } from 'fs';
import { startPyodideAgent } from '#agent/pyodideAgentRunner';
import { startAgent } from '#agent/xmlAgentRunner';
import { FileSystem } from '#functions/filesystem';
import { Perplexity } from '#functions/web/perplexity';
import { PublicWeb } from '#functions/web/web';
import { ClaudeLLMs } from '#llm/models/anthropic';
import { ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { logger } from '#o11y/logger';
import { CodeEditingAgent } from '#swe/codeEditingAgent';
import { TypescriptTools } from '#swe/lang/nodejs/typescriptTools';
import { SoftwareDeveloperAgent } from '#swe/softwareDeveloperAgent';
import { initFirestoreApplicationContext } from '../app';

export async function main() {
	let llms = ClaudeLLMs();
	if (process.env.GCLOUD_PROJECT) {
		await initFirestoreApplicationContext();
		llms = ClaudeVertexLLMs();
	}

	const functions = [FileSystem]; // , CodeEditingAgent, Perplexity, TypescriptTools

	const args = process.argv.slice(2);
	const initialPrompt = args.length > 0 ? args.join(' ') : readFileSync('src/cli/agent-in', 'utf-8');
	console.log(`Prompt: ${initialPrompt}`);

	const agentId = await startPyodideAgent({
		agentName: 'cli-pyagent',
		initialPrompt,
		functions,
		llms,
		humanInLoop: {
			budget: 1,
			count: 5,
		},
	});
	logger.info('AgentId ', agentId);
}

main().then(
	() => console.log('done'),
	(e) => console.error(e),
);
