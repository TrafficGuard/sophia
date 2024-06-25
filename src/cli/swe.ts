import { readFileSync } from 'fs';
import { Span } from '@opentelemetry/api';
import { LlmFunctions } from '#agent/LlmFunctions';
import { AgentContext, AgentLLMs, agentContextStorage, createContext } from '#agent/agentContext';
import { RunAgentConfig } from '#agent/xmlAgentRunner';
import '#fastify/trace-init/trace-init';
import { FileSystem } from '#functions/filesystem';
import { GitLabServer } from '#functions/scm/gitlab';
import { GEMINI_1_5_PRO_LLMS, Gemini_1_5_Pro } from '#llm/models/vertexai';
import { withActiveSpan } from '#o11y/trace';
import { TypescriptTools } from '#swe/lang/nodejs/typescriptTools';
import { appContext } from '../app';
import { CodeEditingAgent } from '../swe/codeEditingAgent';
import { ProjectInfo } from '../swe/projectDetection';
import { SoftwareDeveloperAgent } from '../swe/softwareDeveloperAgent';

import { currentUser } from '#user/userService/userContext';
import { envVarHumanInLoopSettings } from './cliHumanInLoop';

// Used to test the local repo editing workflow in DevEditWorkflow

// Usage:
// npm run edit-local

async function main() {
	const gemini = Gemini_1_5_Pro();
	const llms: AgentLLMs = GEMINI_1_5_PRO_LLMS();

	const functions = new LlmFunctions();
	functions.addFunctionClass(FileSystem);
	functions.addFunctionClass(GitLabServer);

	const config: RunAgentConfig = {
		agentName: 'SWE',
		llms,
		functions,
		initialPrompt: readFileSync('src/cli/swe-in', 'utf-8'),
	};
	const context: AgentContext = createContext(config);
	agentContextStorage.enterWith(context);

	await withActiveSpan('swe', async (span: Span) => {
		span.setAttributes({
			initialPrompt: config.initialPrompt,
		});
		await new SoftwareDeveloperAgent().runSoftwareDeveloperWorkflow(config.initialPrompt);
	});
}

main().then(
	() => console.log('done'),
	(e) => console.error(e),
);
