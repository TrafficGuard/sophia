import { readFileSync } from 'fs';
import { Span } from '@opentelemetry/api';
import { agentContext, enterWithContext } from '#agent/agentContext';
import { FileSystem } from '#agent/filesystem';
import '#fastify/trace-init/trace-init';
import { withActiveSpan } from '#o11y/trace';
import { AGENT_LLMS } from './agentLLMs';
import { DevEditWorkflow } from './swe/devEditWorkflow';
import { TypescriptTools } from './swe/nodejs/typescriptTools';
import { ProjectInfo } from './swe/projectDetection';

// Used to test the local repo editing workflow in DevEditWorkflow

// Usage:
// npm run edit-local

async function main() {
	const llms = AGENT_LLMS;
	enterWithContext(AGENT_LLMS);
	const system = readFileSync('ai-system', 'utf-8');
	const initialPrompt = readFileSync('ai-in', 'utf-8');

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
