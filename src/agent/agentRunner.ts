import * as readline from 'readline';
import { getFunctionDefinitions } from './metadata';
import { Toolbox } from './toolbox';
import { llms, workflowContext } from './workflows';

/**
 * Runs an autonomous agent workflow using the tools provided.
 * @param toolbox The tools the agent has available to call
 * @param initialPrompt The initial user prompt
 * @param systemPrompt The system prompt for the planning and function calling agent control loop
 */

export async function runAgent(toolbox: Toolbox, initialPrompt: string, systemPrompt: string) {
	const llm = llms().hard;

	let currentPrompt = initialPrompt;

	// If we've pasted in a prompt to resume then extract out the initial prompt
	if (initialPrompt.includes('<initial_prompt>')) {
		const startIndex = initialPrompt.indexOf('<initial_prompt>') + '<initial_prompt>'.length;
		const endIndex = initialPrompt.indexOf('</initial_prompt>') - 1;
		initialPrompt = initialPrompt.slice(startIndex, endIndex);
		console.log('Extracted initial prompt');
		console.log('<initial_prompt>');
		console.log(initialPrompt);
		console.log('</initial_prompt>');
	}

	const functionDefinitions = getFunctionDefinitions(toolbox.getTools());
	const systemPromptWithFunctions = updateToolDefinitions(systemPrompt, functionDefinitions);

	// Human in the loop settings
	// How often do we require human input to avoid looping or misguided actions
	const hilBudgetRaw = process.env.HIL_BUDGET;
	const hilCountRaw = process.env.HIL_COUNT;
	const hilBudget = hilBudgetRaw ? parseFloat(hilBudgetRaw) : 0;
	const hilCount = hilCountRaw ? parseInt(hilCountRaw) : 0;

	let countSinceHil = 0;
	let costSinceHil = 0;
	let previousCost = 0;
	while (true) {
		if (hilCount && countSinceHil === hilCount) {
			await waitForInput();
			countSinceHil = 0;
		}
		countSinceHil++;

		const newCosts = workflowContext.getStore().cost - previousCost;
		if (newCosts) console.log('');
		previousCost = workflowContext.getStore().cost;
		costSinceHil += newCosts;
		console.log(`Spent $${costSinceHil.toFixed(2)} since last input. Total cost $${workflowContext.getStore().cost.toFixed(2)}`);
		if (hilBudget && costSinceHil > hilBudget) {
			// format costSinceHil to 2 decimal places
			await waitForInput();
			costSinceHil = 0;
		}

		if (initialPrompt !== currentPrompt) {
			currentPrompt = `<initial_prompt>\n${initialPrompt}\n</initial_prompt>\n${currentPrompt}`;
		}

		const result = await llm.generateTextExpectingFunctions(currentPrompt, systemPromptWithFunctions);
		currentPrompt = result.response;
		const invokers = result.functions.invoke;

		if (!invokers.length) {
			throw new Error('Found no function invocations');
			// TODO Send back the response (ensuring the stop sequence </ response > is stripped) with a note
			// that there was no function calls, and it should call one of the Workflow functions to finish
			// if its not sure what to do next.
		}

		for (const invoker of invokers) {
			try {
				const toolResponse = await toolbox.invokeTool(invoker);
				currentPrompt += `\n${llm.formatFunctionResult(invoker.tool_name, toolResponse)}`;
			} catch (e) {
				console.error('Tool error');
				console.error(e);
				currentPrompt += `\n${llm.formatFunctionError(invoker.tool_name, e)}`;
			}
		}

		/*
		if (invoker.tool_name === WORKFLOW_COMPLETED_NAME) {
			console.log('Task completed');
			break;
		}
		if (invoker.tool_name === WORKFLOW_REQUEST_FEEDBACK) {
			console.log('Task paused');
			console.log(invoker.parameters)
			break;
		}
		*/
	}
}

/**
 * Adding a human in the loop, so it doesn't consume all of your budget
 */
async function waitForInput() {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	const question = (prompt) =>
		new Promise((resolve) => {
			rl.question(prompt, resolve);
		});

	await (async () => {
		await question('Press enter to continue...');
		rl.close();
	})();
}

/**
 * Update the system prompt to include all the function definitions.
 * Requires the system prompt to contain <tools></tools>
 * @param systemPrompt {string} the initial system prompt
 * @param functionDefinitions {string} the function definitions
 * @returns the updated system prompt
 */
export function updateToolDefinitions(systemPrompt: string, functionDefinitions: string): string {
	const regex = /<tools>[\s\S]*?<\/tools>/g;
	const updatedPrompt = systemPrompt.replace(regex, `<tools>${functionDefinitions}</tools>`);
	if (!updatedPrompt.includes(functionDefinitions)) throw new Error('Unable to update tool definitions. Regex replace failed');
	return updatedPrompt;
}
