import { readFileSync } from 'fs';
import { FileSystem } from './agent/filesystem';
import { enterWithContext, workflowContext } from './agent/workflows';
import { WORKFLOW_LLMS } from './index';
import { DevEditWorkflow } from './swe/devEditWorkflow';
import { TypescriptTools } from './swe/nodejs/typescriptTools';
import { ProjectInfo } from './swe/projectDetection';

// Used to test the local repo editing workflow in DevEditWorkflow

// Usage:
// npm run edit-local

async function main() {
	const llms = WORKFLOW_LLMS;
	enterWithContext(WORKFLOW_LLMS);
	workflowContext.getStore().fileSystem = new FileSystem();
	const system = readFileSync('ai-system', 'utf-8');
	const prompt = readFileSync('ai-in', 'utf-8');

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

	await new DevEditWorkflow().runDevEditWorkflow(prompt, projectInfo);
}

main().then(
	() => console.log('done'),
	(e) => console.error(e),
);
