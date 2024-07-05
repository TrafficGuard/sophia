import { readFileSync } from 'fs';
import { Span } from '@opentelemetry/api';
import { LlmFunctions } from '#agent/LlmFunctions';
import { AgentContext, AgentLLMs, agentContext, agentContextStorage, createContext } from '#agent/agentContext';
import { RunAgentConfig } from '#agent/xmlAgentRunner';
import '#fastify/trace-init/trace-init';
import { FileSystem } from '#functions/filesystem';
import { withActiveSpan } from '#o11y/trace';
import { CodeEditingAgent } from '#swe/codeEditingAgent';
import { ProjectInfo } from '#swe/projectDetection';

import { ClaudeLLMs } from '#llm/models/anthropic';
import { ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { currentUser } from '#user/userService/userContext';
import { appContext, initFirestoreApplicationContext } from '../app';
import { envVarHumanInLoopSettings } from './cliHumanInLoop';

// Used to test the local repo editing workflow in CodeEditingAgent

// Usage:
// npm run code

async function main() {
	let llms: AgentLLMs = ClaudeLLMs();
	if (process.env.GCLOUD_PROJECT) {
		await initFirestoreApplicationContext();
		llms = ClaudeVertexLLMs();
	}

	const initialPrompt = readFileSync('src/cli/code-in', 'utf-8');

	const functions = new LlmFunctions();
	functions.addFunctionClass(FileSystem);

	const config: RunAgentConfig = {
		agentName: 'code',
		llms,
		functions,
		user: currentUser(),
		initialPrompt,
		humanInLoop: envVarHumanInLoopSettings(),
	};
	let context: AgentContext = createContext(config);
	agentContextStorage.enterWith(context);

	await appContext().agentStateService.save(context);

	// const info = await new DevRequirementsWorkflow().detectProjectInfo();

	let projectInfo: ProjectInfo | undefined;
	// projectInfo = {
	// 	baseDir: process.cwd(),
	// 	language: 'nodejs',
	// 	initialise: 'npm install',
	// 	compile: 'npm run build',
	// 	format: 'npm run lint && npm run fix',
	// 	staticAnalysis: null,
	// 	test: 'npm run test:unit',
	// 	languageTools: new TypescriptTools(),
	// };

	try {
		await withActiveSpan('code', async (span: Span) => {
			span.setAttributes({
				initialPrompt,
			});
			await new CodeEditingAgent().runCodeEditWorkflow(initialPrompt, projectInfo);
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
