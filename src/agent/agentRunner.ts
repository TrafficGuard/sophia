import * as readline from 'readline';
import { Span } from '@opentelemetry/api';
import { buildFunctionCallHistoryPrompt, buildMemoryPrompt, updateToolDefinitions } from '#agent/agentPromptUtils';
import { getServiceName } from '#fastify/trace-init/trace-init';
import { FunctionResponse } from '#llm/llm';
import { logger } from '#o11y/logger';
import { startSpan, withActiveSpan } from '#o11y/trace';
import { appCtx } from '../app';
import { AgentContext, AgentLLMs, AgentRunningState, agentContext, agentContextStorage, createContext, llms } from './agentContext';
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
	/** The agent to resume */
	resumeAgentId?: string;
}

/**
 * Runs an autonomous agent using the tools provided.
 * @param config {RunAgentConfig} The agent configuration
 */
export async function runAgent(config: RunAgentConfig): Promise<string> {
	const agentStateService = appCtx().agentStateService;

	// start or resume an agent
	const context: AgentContext = config.resumeAgentId
		? await agentStateService.load(config.resumeAgentId)
		: createContext(config.agentName, config.llms, config.resumeAgentId);

	let resumedState: AgentRunningState | null = null;
	if (config.resumeAgentId) resumedState = context.state;

	agentContextStorage.enterWith(context);
	context.toolbox.addTool(context.fileSystem, 'FileSystem');

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
	let hilBudget = hilBudgetRaw ? parseFloat(hilBudgetRaw) : 0;
	const hilCount = hilCountRaw ? parseInt(hilCountRaw) : 0;
	// Default to $1 budget to avoid accidents
	if (!hilCount && !hilBudget) {
		hilBudget = 1;
	}

	let countSinceHil = 0;
	let costSinceHil = 0;
	let previousCost = 0;

	const ctx: AgentContext = agentContextStorage.getStore();
	context.state = 'agent';
	await agentStateService.save(context);

	await withActiveSpan(agentName, async (span: Span) => {
		span.setAttributes({
			initialPrompt,
			'service.name': getServiceName(),
		});

		let shouldContinue = true;
		while (shouldContinue) {
			shouldContinue = await withActiveSpan('Agent control loop', async (span) => {
				let completed = false;
				let requestFeedback = false;
				let anyInvokeErrors = false;
				let controlError = false;
				try {
					if (hilCount && countSinceHil === hilCount) {
						await waitForInput();
						countSinceHil = 0;
					}
					countSinceHil++;

					const newCosts = agentContext().cost - previousCost;
					if (newCosts) logger.debug(`New costs $${newCosts.toFixed(2)}`);
					previousCost = agentContext().cost;
					costSinceHil += newCosts;
					logger.info(`Spent $${costSinceHil.toFixed(2)} since last input. Total cost $${agentContextStorage.getStore().cost.toFixed(2)}`);
					if (hilBudget && costSinceHil > hilBudget) {
						// format costSinceHil to 2 decimal places
						await waitForInput();
						costSinceHil = 0;
					}

					// If it's not the first control loop run, and not resuming the agent, then pre-pend the initial prompt
					if (initialPrompt !== currentPrompt && !currentPrompt.includes('<initial_prompt>')) {
						currentPrompt = `<initial_prompt>\n${initialPrompt}\n</initial_prompt>\n${currentPrompt}`;
					}
					const currentPromptWithHistoryAndMemory = buildFunctionCallHistoryPrompt() + buildMemoryPrompt() + currentPrompt;

					const result: FunctionResponse = await llm.generateTextExpectingFunctions(currentPromptWithHistoryAndMemory, systemPromptWithFunctions);

					currentPrompt = buildFunctionCallHistoryPrompt() + buildMemoryPrompt() + result.response;
					const invokers = result.functions.invoke;

					if (!invokers.length) {
						throw new Error('Found no function invocations');
						// TODO Send back the response (ensuring the stop sequence </ response > is stripped) with a note
						// that there was no function calls, and it should call one of the Workflow functions to finish
						// if its not sure what to do next.
					}
					ctx.state = 'functions';
					ctx.inputPrompt = currentPrompt;
					ctx.invoking.push(...invokers);
					await agentStateService.save(ctx);

					for (const invoker of invokers) {
						try {
							const toolResponse = await toolbox.invokeTool(invoker);
							let functionResult = llm.formatFunctionResult(invoker.tool_name, toolResponse);
							if (functionResult.startsWith('<response>')) functionResult = functionResult.slice(10);
							// The trailing </response> will be removed as it's a stop word for the LLMs
							currentPrompt += `\n${llm.formatFunctionResult(invoker.tool_name, toolResponse)}`;

							ctx.functionCallHistory.push({
								tool_name: invoker.tool_name,
								parameters: invoker.parameters,
								stdout: JSON.stringify(toolResponse),
							});
							// Should check if completed or requestFeedback then there's no more invokers
							if (invoker.tool_name === AGENT_COMPLETED_NAME) {
								logger.info('Task completed');
								ctx.state = 'completed';
								completed = true;
								break;
							}
							if (invoker.tool_name === AGENT_REQUEST_FEEDBACK) {
								logger.info('Feedback requested');
								ctx.state = 'feedback';
								requestFeedback = true;
								break;
							}
						} catch (e) {
							anyInvokeErrors = true;
							ctx.state = 'error';
							logger.error(e, 'Tool error');
							ctx.error = e.toString();
							await agentStateService.save(ctx);
							currentPrompt += `\n${llm.formatFunctionError(invoker.tool_name, e)}`;

							ctx.functionCallHistory.push({
								tool_name: invoker.tool_name,
								parameters: invoker.parameters,
								stdout: ctx.error,
							});
							// How to handle tool invocation errors? Give the agent a chance to re-try or try something different, or always human in loop?
						}
					}
					// Function invocations are complete
					ctx.invoking = [];
					if (!anyInvokeErrors && !completed && !requestFeedback) ctx.state = 'agent';
					ctx.inputPrompt = currentPrompt;
					await agentStateService.save(ctx);
				} catch (e) {
					controlError = true;
					ctx.state = 'error';
					ctx.error = e.toString();
					ctx.inputPrompt = currentPrompt;
					await agentStateService.save(ctx);
				}
				// return if the control loop should continue
				return !(completed || requestFeedback || anyInvokeErrors || controlError);
			});
		}
	});
	return context.agentId;
}

class HumanInLoopReturn extends Error {}

/**
 * Adding a human in the loop, so it doesn't consume all of your budget
 */

async function waitForInput() {
	const span = startSpan('humanInLoop');

	await appCtx().agentStateService.updateState(agentContextStorage.getStore(), 'hil');

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
