import * as readline from 'readline';
import { Span } from '@opentelemetry/api';
import { FunctionResponse } from '#llm/llm';
import { logger } from '#o11y/logger';
import { startSpan, withActiveSpan } from '#o11y/trace';
import { appCtx } from '../app';
import { AgentContext, AgentLLMs, agentContext, enterWithContext, llms } from './agentContext';
import { AGENT_COMPLETED_NAME, AGENT_REQUEST_FEEDBACK } from './agentFunctions';
import { getFunctionDefinitions } from './metadata';
import { Toolbox } from './toolbox';

export interface RunAgentConfig {
	/** The name of this agent */
	agentName: string;
	/** The tools the agent has available to call */
	toolbox: Toolbox;
	/** The initial user prompt */
	initialPrompt: string;
	/** The agent system prompt */
	systemPrompt: string;
	/** Settings for requiring a human in the loop */
	humanInLoop?: { budget?: number; count?: number };
	/** The LLMs available to use */
	llms: AgentLLMs;
}

/**
 * Runs an autonomous agent using the tools provided.
 * @param config {RunAgentConfig} The agent configuration
 */
export async function runAgent(config: RunAgentConfig) {
	enterWithContext(config.llms);

	const llm = llms().hard;

	let currentPrompt = config.initialPrompt;
	let initialPrompt = config.initialPrompt;
	const toolbox = config.toolbox;
	const agentName = config.agentName;

	const systemPrompt = updateToolDefinitions(config.systemPrompt, getFunctionDefinitions(toolbox.getTools()));
	// If we've pasted in a prompt to resume then extract out the initial prompt
	if (initialPrompt.includes('<initial_prompt>')) {
		const startIndex = initialPrompt.indexOf('<initial_prompt>') + '<initial_prompt>'.length;
		const endIndex = initialPrompt.indexOf('</initial_prompt>') - 1;
		initialPrompt = initialPrompt.slice(startIndex, endIndex);
		logger.info('Extracted initial prompt');
		logger.debug(`<initial_prompt>${initialPrompt}</initial_prompt>`);
	}
	const functionDefinitions = getFunctionDefinitions(toolbox.getTools());
	const systemPromptWithFunctions = updateToolDefinitions(systemPrompt, functionDefinitions);

	// Human in the loop settings
	// How often do we require human input to avoid misguided actions and wasting money
	const hilBudgetRaw = process.env.HIL_BUDGET;
	const hilCountRaw = process.env.HIL_COUNT;
	const hilBudget = hilBudgetRaw ? parseFloat(hilBudgetRaw) : 0;
	const hilCount = hilCountRaw ? parseInt(hilCountRaw) : 0;

	let countSinceHil = 0;
	let costSinceHil = 0;
	let previousCost = 0;

	const ctx: AgentContext = agentContext.getStore();
	ctx.state = 'agent';
	await appCtx().agentStateService.save(ctx);

	await withActiveSpan(agentName, async (span: Span) => {
		span.setAttributes({
			initialPrompt,
		});

		while (true) {
			const shouldContinue = await withActiveSpan('controlLoop', async (span) => {
				if (hilCount && countSinceHil === hilCount) {
					await waitForInput();
					countSinceHil = 0;
				}
				countSinceHil++;

				const newCosts = agentContext.getStore().cost - previousCost;
				if (newCosts) console.log(`New costs $${newCosts.toFixed(2)}`);
				previousCost = agentContext.getStore().cost;
				costSinceHil += newCosts;
				console.log(`Spent $${costSinceHil.toFixed(2)} since last input. Total cost $${agentContext.getStore().cost.toFixed(2)}`);
				if (hilBudget && costSinceHil > hilBudget) {
					// format costSinceHil to 2 decimal places
					await waitForInput();
					costSinceHil = 0;
				}

				if (initialPrompt !== currentPrompt) {
					currentPrompt = `<initial_prompt>\n${initialPrompt}\n</initial_prompt>\n${currentPrompt}`;
				}

				const result: FunctionResponse = await llm.generateTextExpectingFunctions(currentPrompt, systemPromptWithFunctions);
				currentPrompt = result.response;
				const invokers = result.functions.invoke;

				if (!invokers.length) {
					throw new Error('Found no function invocations');
					// TODO Send back the response (ensuring the stop sequence </ response > is stripped) with a note
					// that there was no function calls, and it should call one of the Workflow functions to finish
					// if its not sure what to do next.
				}

				let completed = false;
				let requestFeedback = false;
				for (const invoker of invokers) {
					if (invoker.tool_name === AGENT_COMPLETED_NAME) {
						console.log('Task completed');
						completed = true;
						break;
					}
					if (invoker.tool_name === AGENT_REQUEST_FEEDBACK) {
						console.log('Feedback requested');
						requestFeedback = true;
						break;
					}

					try {
						const toolResponse = await toolbox.invokeTool(invoker);
						currentPrompt += `\n${llm.formatFunctionResult(invoker.tool_name, toolResponse)}`;
					} catch (e) {
						console.error('Tool error');
						console.error(e);
						currentPrompt += `\n${llm.formatFunctionError(invoker.tool_name, e)}`;
					}
				}
				// return if the control loop should continue
				return !(completed || requestFeedback);
			});
			if (!shouldContinue) break;
		}
	});
}

/**
 * Adding a human in the loop, so it doesn't consume all of your budget
 */

async function waitForInput() {
	const span = startSpan('humanInLoop');

	await appCtx().agentStateService.updateState(agentContext.getStore(), 'hil');

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
	span.end();
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
