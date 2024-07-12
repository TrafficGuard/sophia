import '#fastify/trace-init/trace-init';

import { readFileSync } from 'fs';
import { startAgent } from '#agent/xmlAgentRunner';
import { FileSystem } from '#functions/filesystem';
import { Perplexity } from '#functions/web/perplexity';
import { PublicWeb } from '#functions/web/web';
import { ClaudeLLMs } from '#llm/models/anthropic';
import { ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { SoftwareDeveloperAgent } from '#swe/softwareDeveloperAgent';
import { initFirestoreApplicationContext } from '../app';

export async function main() {
	let llms = ClaudeLLMs();
	if (process.env.GCLOUD_PROJECT) {
		await initFirestoreApplicationContext();
		llms = ClaudeVertexLLMs();
	}

	const functions = [FileSystem, SoftwareDeveloperAgent, Perplexity, PublicWeb];

	const args = process.argv.slice(2);
	const initialPrompt = args.length > 0
		? args.join(' ')
		: readFileSync('src/cli/agent-in', 'utf-8');

	await startAgent({
		agentName: 'cli-agent',
		initialPrompt,
		functions,
		llms,
	});
}

main().then(
	() => console.log('done'),
	(e) => console.error(e),
);
