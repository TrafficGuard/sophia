import { loadPyodide } from 'pyodide';
import { LlmFunctions } from '#agent/LlmFunctions';
import { agentContext } from '#agent/agentContext';
import { runAgentWorkflow } from '#agent/agentWorkflowRunner';
import { startAgent } from '#agent/pyodideAgentRunner';
import { RunAgentConfig } from '#agent/xmlAgentRunner';
import { FileSystem } from '#functions/filesystem';
import { ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { logger } from '#o11y/logger';
import { getFunctionDefinitions } from '../functionDefinition/functions';
import { functionRegistry } from '../functionRegistry';

async function main() {
	const args = process.argv.slice(2);
	const initialPrompt = args.join(' ');

	if (!initialPrompt) {
		console.error('Please provide an initial prompt.');
		process.exit(1);
	}

	const functions = new LlmFunctions();
	functions.addFunctionClass(FileSystem);

	try {
		console.log('Initializing Pyodide...');
		const pyodide = await loadPyodide();
		console.log('Pyodide initialized successfully');
		const config: RunAgentConfig = {
			agentName: 'PyodideAgent',
			functions,
			initialPrompt,
			llms: ClaudeVertexLLMs(),
		};
		const agentId = await startAgent(config);
		await runAgentWorkflow(config, async () => {
			const llmFunctions: LlmFunctions = agentContext().functions;
			for (const functionClassInstance of llmFunctions.getFunctionInstances()) {
				const functionClassName = functionClassInstance.constructor.name;
				const functionDefinitions = getFunctionDefinitions(functionClassInstance);

				for (const [funcName, funcDef] of Object.entries(functionDefinitions)) {
					const methodName = funcName.split('.')[1];
					pyodide.globals.set(`${functionClassName}.${methodName}`, functionClassInstance[methodName].bind(functionClassInstance));
				}
			}

			// Select files under the functions folder
			const fileSystem = new FileSystem();
			const functionsPath = path.join(process.cwd(), 'src', 'functions');
			const files = await fileSystem.listFilesRecursively(functionsPath);
			const typescriptFiles = files.filter(file => file.endsWith('.ts'));

			for (const file of typescriptFiles) {
				const contents = await fileSystem.getFileContents(file);
				const relativePath = path.relative(process.cwd(), file);
				pyodide.runPython(`
					import os
					
					file_path = '${relativePath}'
					os.makedirs(os.path.dirname(file_path), exist_ok=True)
					with open(file_path, 'w') as f:
						f.write('''${contents}''')
				`);
			}
			
			// Load the TypeScript files in Pyodide
			pyodide.runPython(`
				import os
				import glob
				
				ts_files = glob.glob('src/functions/**/*.ts', recursive=True)
				for ts_file in ts_files:
					with open(ts_file, 'r') as f:
						exec(f.read())
			`);
		});

		logger.info(`Pyodide Agent started with ID: ${agentId}`);
	} catch (error) {
		logger.error('Error starting Pyodide Agent:', error);
		process.exit(1);
	}
}

main();
