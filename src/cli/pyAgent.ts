import { loadPyodide } from 'pyodide';
import { LlmFunctions } from '#agent/LlmFunctions';
import { llms } from '#agent/agentContext';
import { startAgent } from '#agent/pyodideAgentRunner';
import { FileSystem } from '#functions/filesystem';
import { logger } from '#o11y/logger';

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
		await pyodide.loadPackage('micropip');
		const micropip = pyodide.pyimport('micropip');
		await micropip.install('numpy');
		console.log('Pyodide initialized successfully');

		const agentId = await startAgent({
			agentName: 'PyodideAgent',
			functions,
			initialPrompt,
			llms: llms(),
		});

		logger.info(`Pyodide Agent started with ID: ${agentId}`);
	} catch (error) {
		logger.error('Error starting Pyodide Agent:', error);
		process.exit(1);
	}
}

main();
import { loadPyodide } from 'pyodide';
import { LlmFunctions } from '#agent/LlmFunctions';
import { llms } from '#agent/agentContext';
import { startAgent } from '#agent/pyodideAgentRunner';
import { FileSystem } from '#functions/filesystem';
import { logger } from '#o11y/logger';

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
        await pyodide.loadPackage('micropip');
        const micropip = pyodide.pyimport('micropip');
        await micropip.install('numpy');
        console.log('Pyodide initialized successfully');

        const agentId = await startAgent({
            agentName: 'PyodideAgent',
            functions,
            initialPrompt,
            llms: llms(),
        });

        logger.info(`Pyodide Agent started with ID: ${agentId}`);
    } catch (error) {
        logger.error('Error starting Pyodide Agent:', error);
        process.exit(1);
    }
}

main();
