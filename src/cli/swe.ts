import { readFileSync } from 'fs';
import { AgentLLMs } from '#agent/agentContext';
import { RunAgentConfig } from '#agent/agentRunner';
import { runAgentWorkflow } from '#agent/agentWorkflowRunner';
import '#fastify/trace-init/trace-init';
import { FileSystem } from '#functions/filesystem';
import { GitLab } from '#functions/scm/gitlab';
import { Perplexity } from '#functions/web/perplexity';
import { ClaudeLLMs } from '#llm/models/anthropic';
import { ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { CodeEditingAgent } from '#swe/codeEditingAgent';
import { SoftwareDeveloperAgent } from '#swe/softwareDeveloperAgent';
import { initFirestoreApplicationContext } from '../app';

// Used to test the SoftwareDeveloperAgent

// Usage:
// npm run swe

async function main() {
	let llms: AgentLLMs = ClaudeLLMs();
	if (process.env.GCLOUD_PROJECT) {
		await initFirestoreApplicationContext();
		llms = ClaudeVertexLLMs();
	}

	const args = process.argv.slice(2);
	const initialPrompt = args.length > 0 ? args.join(' ') : readFileSync('src/cli/swe-in', 'utf-8');

	const config: RunAgentConfig = {
		agentName: 'cli-SWE',
		llms,
		functions: [FileSystem, CodeEditingAgent, Perplexity],
		initialPrompt,
	};

	await runAgentWorkflow(config, async () => {
		await new SoftwareDeveloperAgent().runSoftwareDeveloperWorkflow(config.initialPrompt);
	});
}

main().then(
	() => console.log('done'),
	(e) => console.error(e),
);
