import { readFileSync } from 'fs';
import { Span } from '@opentelemetry/api';
import { LlmFunctions } from '#agent/LlmFunctions';
import { AgentContext, AgentLLMs, agentContext, agentContextStorage, createContext } from '#agent/agentContext';
import { RunAgentConfig } from '#agent/xmlAgentRunner';
import '#fastify/trace-init/trace-init';
import { FileSystem } from '#functions/filesystem';
import { GitLab } from '#functions/scm/gitlab';
import { ClaudeLLMs } from '#llm/models/anthropic';
import { ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { withActiveSpan } from '#o11y/trace';
import { CodeEditingAgent } from '#swe/codeEditingAgent';
import { SoftwareDeveloperAgent } from '#swe/softwareDeveloperAgent';
import { appContext, initFirestoreApplicationContext } from '../app';

// Used to test the local repo editing workflow in DevEditWorkflow

// Usage:
// npm run swe

async function main() {
	let llms: AgentLLMs = ClaudeLLMs();
	if (process.env.GCLOUD_PROJECT) {
		await initFirestoreApplicationContext();
		llms = ClaudeVertexLLMs();
	}

	const functions = new LlmFunctions();
	functions.addFunctionClass(FileSystem);
	functions.addFunctionClass(GitLab);

	const config: RunAgentConfig = {
		agentName: 'SWE',
		llms,
		functions,
		initialPrompt: readFileSync('src/cli/swe-in', 'utf-8'),
	};
	let context: AgentContext = createContext(config);
	agentContextStorage.enterWith(context);

	try {
		await withActiveSpan('SWE', async (span: Span) => {
			span.setAttributes({
				initialPrompt: config.initialPrompt,
			});
			await new SoftwareDeveloperAgent().runSoftwareDeveloperWorkflow(config.initialPrompt);
		});
		context = agentContext();
		context.state = 'completed';
	} catch (e) {
		context.state = 'error';
		context.error = JSON.stringify(e);
	} finally {
		await appContext().agentStateService.save(context);
	}
}

main().then(
	() => console.log('done'),
	(e) => console.error(e),
);
