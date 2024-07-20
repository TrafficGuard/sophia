import '#fastify/trace-init/trace-init'; // leave an empty line next so this doesn't get sorted from the first line

import { readFileSync } from 'fs';
import { AgentLLMs, llms } from '#agent/agentContext';
import { RunAgentConfig } from '#agent/agentRunner';
import { runAgentWorkflow } from '#agent/agentWorkflowRunner';
import { shutdownTrace } from '#fastify/trace-init/trace-init';
import { GitLab } from '#functions/scm/gitlab';
import { ClaudeLLMs } from '#llm/models/anthropic';
import { ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { CodeEditingAgent } from '#swe/codeEditingAgent';
import { initFirestoreApplicationContext } from '../app';
import { CliOptions, getLastRunAgentId, parseProcessArgs, saveAgentId } from './cli';

async function main() {
	let agentLlms: AgentLLMs = ClaudeLLMs();
	if (process.env.GCLOUD_PROJECT) {
		await initFirestoreApplicationContext();
		agentLlms = ClaudeVertexLLMs();
	}

	const { initialPrompt, resumeLastRun } = parseProcessArgs();

	let lastRunAgentId: string | null = null;

	if (resumeLastRun) {
		lastRunAgentId = getLastRunAgentId('code');
		if (lastRunAgentId) {
			console.log(`Resuming last run with agent ID: ${lastRunAgentId}`);
		} else {
			console.log('No previous run found. Starting a new run.');
		}
	}

	let prompt = initialPrompt;
	if (!prompt.trim()) {
		prompt = readFileSync('src/cli/code-in', 'utf-8');
	}

	console.log(`Prompt: ${prompt}`);

	const config: RunAgentConfig = {
		agentName: 'cli-code',
		llms: agentLlms,
		functions: [GitLab], //FileSystem,
		initialPrompt: prompt,
		humanInLoop: {
			budget: 2,
		},
	};

	if (lastRunAgentId) {
		config.resumeAgentId = lastRunAgentId;
	}

	const agentId = await runAgentWorkflow(config, async () => {
		await new CodeEditingAgent().runCodeEditWorkflow(config.initialPrompt);
	});

	if (agentId) {
		saveAgentId('code', agentId);
	}

	await shutdownTrace();
}

main().then(
	() => console.log('done'),
	(e) => console.error(e),
);
