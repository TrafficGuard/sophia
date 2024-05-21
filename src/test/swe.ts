import { readFileSync } from 'fs';
import { Span } from '@opentelemetry/api';
import { AgentContext, AgentLLMs, agentContextStorage, createContext } from '#agent/agentContext';
import { RunAgentConfig } from '#agent/agentRunner';
import { getHumanInLoopSettings } from '#agent/humanInLoop';
import { Toolbox } from '#agent/toolbox';
import '#fastify/trace-init/trace-init';
import { FileSystem } from '#functions/filesystem';
import { GitLabServer } from '#functions/scm/gitlab';
import { GEMINI_1_5_PRO_LLMS, Gemini_1_5_Pro } from '#llm/models/vertexai';
import { withActiveSpan } from '#o11y/trace';
import { TypescriptTools } from '#swe/lang/nodejs/typescriptTools';
import { appContext } from '../app';
import { CodeEditingWorkflow } from '../swe/codeEditingWorkflow';
import { ProjectInfo } from '../swe/projectDetection';
import { SoftwareDeveloperWorkflow } from '../swe/softwareDeveloperWorkflow';

import { currentUser } from '#user/userService/userContext';

// Used to test the local repo editing workflow in DevEditWorkflow

// Usage:
// npm run edit-local

async function main() {
	const gemini = Gemini_1_5_Pro();
	const llms: AgentLLMs = GEMINI_1_5_PRO_LLMS();
	const initialPrompt = readFileSync('src/test/swe-in', 'utf-8');
	//const system = readFileSync('src/test/agent-system', 'utf-8');

	const toolbox = new Toolbox();
	toolbox.addToolType(FileSystem);
	toolbox.addToolType(GitLabServer);

	const config: RunAgentConfig = {
		agentName: 'SWE',
		llms,
		toolbox,
		user: currentUser(),
		initialPrompt,
		humanInLoop: getHumanInLoopSettings(),
	};
	const context: AgentContext = createContext(config);
	agentContextStorage.enterWith(context);

	await withActiveSpan('swe', async (span: Span) => {
		span.setAttributes({
			initialPrompt,
		});
		await new SoftwareDeveloperWorkflow().runSoftwareDeveloperWorkflow(initialPrompt);
	});
}

main().then(
	() => console.log('done'),
	(e) => console.error(e),
);
