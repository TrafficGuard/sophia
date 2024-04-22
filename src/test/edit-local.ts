import { readFileSync } from 'fs';
import { Span } from '@opentelemetry/api';
import { AgentContext, AgentLLMs, agentContextStorage, createContext, enterWithContext } from '#agent/agentContext';
import { FileSystem } from '#agent/filesystem';
import '#fastify/trace-init/trace-init';
import { GEMINI_1_5_PRO_LLMS, Gemini_1_5_Pro } from '#llm/models/vertexai';
import { withActiveSpan } from '#o11y/trace';
import { AGENT_LLMS } from '../agentLLMs';
import { DevEditWorkflow } from '../swe/devEditWorkflow';
import { TypescriptTools } from '../swe/nodejs/typescriptTools';
import { ProjectInfo } from '../swe/projectDetection';

// Used to test the local repo editing workflow in DevEditWorkflow

// Usage:
// npm run edit-local

async function main() {
	const gemini = Gemini_1_5_Pro();
	const llms: AgentLLMs = GEMINI_1_5_PRO_LLMS();

	const context: AgentContext = createContext('edit-local', llms);
	agentContextStorage.enterWith(context);
	context.toolbox.addTool(context.fileSystem, 'FileSystem');

	//const system = readFileSync('src/test/agent-system', 'utf-8');
	const initialPrompt = readFileSync('src/test/edit-local-in', 'utf-8');

	// const info = await new DevRequirementsWorkflow().detectProjectInfo();

	const projectInfo: ProjectInfo = {
		baseDir: process.cwd(),
		language: 'nodejs',
		initialise: 'npm install',
		compile: 'npm run build',
		format: 'npm run lint && npm run fix',
		staticAnalysis: null,
		test: 'npm run test:unit',
		languageTools: new TypescriptTools(),
	};
	await withActiveSpan('edit-local', async (span: Span) => {
		span.setAttributes({
			initialPrompt,
		});
		await new DevEditWorkflow().runDevEditWorkflow(initialPrompt, projectInfo);
	});
}

main().then(
	() => console.log('done'),
	(e) => console.error(e),
);
