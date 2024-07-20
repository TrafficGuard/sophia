import { readFileSync } from 'fs';
import { AgentContext, AgentLLMs } from '#agent/agentContext';
import { RunAgentConfig } from '#agent/agentRunner';
import { runAgentWorkflow } from '#agent/agentWorkflowRunner';
import '#fastify/trace-init/trace-init';
import { shutdownTrace } from '#fastify/trace-init/trace-init';
import { GitLab } from '#functions/scm/gitlab';
import { ClaudeLLMs } from '#llm/models/anthropic';
import { ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { CodeEditingAgent } from '#swe/codeEditingAgent';
import { initFirestoreApplicationContext } from '../app';
import { CliOptions, getLastRunAgentId, parseCliOptions, saveAgentId } from './cli';

async function main() {
	let llms: AgentLLMs = ClaudeLLMs();
	if (process.env.GCLOUD_PROJECT) {
		await initFirestoreApplicationContext();
		llms = ClaudeVertexLLMs();
	}

	const { initialPrompt, resumeLastRun } = parseCliOptions(process.argv);

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
		llms,
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
