import { readFileSync } from 'fs';
import { AgentLLMs } from '#agent/agentContext';
import { runAgentWorkflow } from '#agent/agentWorkflowRunner';
import { RunAgentConfig } from '#agent/xmlAgentRunner';
import '#fastify/trace-init/trace-init';
import { FileSystem } from '#functions/filesystem';
import { GitLab } from '#functions/scm/gitlab';
import { ClaudeLLMs } from '#llm/models/anthropic';
import { ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { SoftwareDeveloperAgent } from '#swe/softwareDeveloperAgent';
import { initFirestoreApplicationContext } from '../app';

// Used to test the local repo editing workflow in DevEditWorkflow

// Usage:
// npm run swe

async function main() {
	let llms: AgentLLMs = ClaudeLLMs();
	if (process.env.GCLOUD_PROJECT) {
		await initFirestoreApplicationContext();
		llms = ClaudeVertexLLMs();
	}

	const config: RunAgentConfig = {
		agentName: 'SWE',
		llms,
		functions: [FileSystem, GitLab],
		initialPrompt: readFileSync('src/cli/swe-in', 'utf-8'),
	};

	await runAgentWorkflow(config, async () => {
		await new SoftwareDeveloperAgent().runSoftwareDeveloperWorkflow(config.initialPrompt);
	});
}

main().then(
	() => console.log('done'),
	(e) => console.error(e),
);
