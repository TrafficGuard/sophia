import '#fastify/trace-init/trace-init'; // leave an empty line next so this doesn't get sorted from the first line

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { AgentContext, AgentLLMs } from '#agent/agentContext';
import { RunAgentConfig } from '#agent/agentRunner';
import { runAgentWorkflow } from '#agent/agentWorkflowRunner';
import { GitLab } from '#functions/scm/gitlab';
import { FileSystem } from '#functions/storage/filesystem';
import { Perplexity } from '#functions/web/perplexity';
import { ClaudeLLMs } from '#llm/models/anthropic';
import { ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { CodeEditingAgent } from '#swe/codeEditingAgent';
import { SoftwareDeveloperAgent } from '#swe/softwareDeveloperAgent';
import { initFirestoreApplicationContext } from '../app';
import { getLastRunAgentId, parseCliOptions, saveAgentId } from './cli';

// Used to test the SoftwareDeveloperAgent

// Usage:
// npm run swe

async function main() {
	let llms: AgentLLMs = ClaudeLLMs();
	if (process.env.GCLOUD_PROJECT) {
		await initFirestoreApplicationContext();
		llms = ClaudeVertexLLMs();
	}

	let { initialPrompt, resumeLastRun } = parseProcessArgs();
	let lastRunAgentId: string | null = null;

	if (resumeLastRun) {
		lastRunAgentId = getLastRunAgentId('swe');
		if (!lastRunAgentId) {
			console.log('No previous run found. Starting a new run.');
		}
	}

	if (!initialPrompt.trim() && !lastRunAgentId) {
		initialPrompt = readFileSync('src/cli/swe-in', 'utf-8');
	}

	const config: RunAgentConfig = {
		agentName: 'cli-SWE',
		llms,
		functions: [FileSystem, CodeEditingAgent, Perplexity],
		initialPrompt: initialPrompt.trim(),
		resumeAgentId: lastRunAgentId || undefined,
	};

	await runAgentWorkflow(config, async (agent: AgentContext) => {
		await new SoftwareDeveloperAgent().runSoftwareDeveloperWorkflow(config.initialPrompt);
		if (agent.agentId) {
			saveAgentId('swe', agent.agentId);
		}
	});
}

main().then(
	() => console.log('done'),
	(e) => console.error(e),
);
