import { loadPyodide } from 'pyodide';
import { LlmFunctions } from '#agent/LlmFunctions';
import { startAgent } from '#agent/pyodideAgentRunner';
import { FileSystem } from '#functions/filesystem';
import { logger } from '#o11y/logger';
import { ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { runAgentWorkflow } from '#agent/agentWorkflowRunner';
import { RunAgentConfig } from '#agent/xmlAgentRunner';
import { agentContext } from '#agent/agentContext';
import { functionRegistry } from '../functionRegistry';
import { getFunctionDefinitions } from '../functionDefinition/functions';

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
		}
		const agentId ='x'// = await startAgent(config);
        await runAgentWorkflow(config, async () => {
            
            const llmFunctions: LlmFunctions = agentContext().functions
            for(const functionClassInstance of llmFunctions.getFunctionInstances()) {
                const functionClassName = functionClassInstance.constructor.name;
                const functionDefinitions = getFunctionDefinitions(functionClassInstance);
                
                for (const [funcName, funcDef] of Object.entries(functionDefinitions)) {
                    const methodName = funcName.split('.')[1];
                    pyodide.globals.set(`${functionClassName}.${methodName}`, functionClassInstance[methodName].bind(functionClassInstance));
                }
            }
        });

		logger.info(`Pyodide Agent started with ID: ${agentId}`);
	} catch (error) {
		logger.error('Error starting Pyodide Agent:', error);
		process.exit(1);
	}
}

main();
