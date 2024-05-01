import { readFileSync } from 'fs';
import { Span } from '@opentelemetry/api';
import { AgentContext, AgentLLMs, agentContextStorage, createContext, enterWithContext } from '#agent/agentContext';
import { FileSystem } from '#agent/filesystem';
import '#fastify/trace-init/trace-init';
import { GEMINI_1_5_PRO_LLMS, Gemini_1_5_Pro } from '#llm/models/vertexai';
import { withActiveSpan } from '#o11y/trace';
import { AGENT_LLMS } from '../agentLLMs';
import { GitLabServer } from '../functions/scm/gitlab';
import { DevEditWorkflow } from '../swe/devEditWorkflow';
import { DevRequirementsWorkflow } from '../swe/devRequirementsWorkflow';
import { TypescriptTools } from '../swe/nodejs/typescriptTools';
import { ProjectInfo } from '../swe/projectDetection';

// Used to test the local repo editing workflow in DevEditWorkflow

// Usage:
// npm run edit-local

async function main() {
	const gemini = Gemini_1_5_Pro();
	const llms: AgentLLMs = GEMINI_1_5_PRO_LLMS();

	const context: AgentContext = createContext('SWE', llms);
	agentContextStorage.enterWith(context);
	//context.fileSystem = new FileSystem('//Users/danielcampagnoli/gl/devops/terra')
	context.toolbox.addTool(context.fileSystem, 'FileSystem');
	context.scm = new GitLabServer();

	//const system = readFileSync('src/test/agent-system', 'utf-8');

	const initialPrompt = readFileSync('src/test/swe-in', 'utf-8');

	// const info = await new DevRequirementsWorkflow().detectProjectInfo();

	await withActiveSpan('swe', async (span: Span) => {
		span.setAttributes({
			initialPrompt,
		});
		await new DevRequirementsWorkflow().runSoftwareDeveloperWorkflow(initialPrompt);
	});
}

main().then(
	() => console.log('done'),
	(e) => console.error(e),
);
