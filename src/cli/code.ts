import { readFileSync } from 'fs';
import { AgentLLMs } from '#agent/agentContext';
import { RunAgentConfig } from '#agent/agentRunner';
import { runAgentWorkflow } from '#agent/agentWorkflowRunner';
import '#fastify/trace-init/trace-init';
import { FileSystem } from '#functions/filesystem';
import { ClaudeLLMs } from '#llm/models/anthropic';
import { ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { CodeEditingAgent } from '#swe/codeEditingAgent';
import { initFirestoreApplicationContext } from '../app';

// Used to test the local repo editing workflow in CodeEditingAgent

// Usage:
// npm run code

async function main() {
	let llms: AgentLLMs = ClaudeLLMs();
	if (process.env.GCLOUD_PROJECT) {
		await initFirestoreApplicationContext();
		llms = ClaudeVertexLLMs();
	}

	const args = process.argv.slice(2);
	const initialPrompt = args.length > 0 ? args.join(' ') : readFileSync('src/cli/code-in', 'utf-8');
	console.log(`Prompt: ${initialPrompt}`);

	const config: RunAgentConfig = {
		agentName: 'cli-code',
		llms,
		functions: [FileSystem],
		initialPrompt,
	};

	await runAgentWorkflow(config, async () => {
		await new CodeEditingAgent().runCodeEditWorkflow(config.initialPrompt);
	});
}

main().then(
	() => console.log('done'),
	(e) => console.error(e),
);
