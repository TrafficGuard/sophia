import { readFileSync } from 'fs';
import * as readline from 'readline';
import { Span, SpanStatusCode } from '@opentelemetry/api';
import { AGENT_COMPLETED_NAME, AGENT_REQUEST_FEEDBACK } from '#agent/agentFunctions';
import { buildFunctionCallHistoryPrompt, buildMemoryPrompt, updateFunctionDefinitions } from '#agent/agentPromptUtils';
import { getServiceName } from '#fastify/trace-init/trace-init';
import { Slack } from '#functions/slack';
import { FunctionCallResult, FunctionResponse } from '#llm/llm';
import { logger } from '#o11y/logger';
import { startSpan, withActiveSpan } from '#o11y/trace';
import { User } from '#user/user';
import { sleep } from '#utils/async-utils';
import { envVar } from '#utils/env-var';
import { appContext } from '../app';
import { getFunctionDefinitions } from '../functionDefinition/functions';
import { LlmFunctions } from './LlmFunctions';
import { AgentContext, AgentLLMs, AgentRunningState, agentContext, agentContextStorage, createContext, llms } from './agentContext';

export const SUPERVISOR_RESUMED_FUNCTION_NAME = 'Supervisor.Resumed';
export const SUPERVISOR_CANCELLED_FUNCTION_NAME = 'Supervisor.Cancelled';

const FUNCTION_OUTPUT_SUMMARIZE_LENGTH = 2000;

export interface RunAgentConfig {
	/** Uses currentUser() if not provided */
	user?: User;
	/** The name of this agent */
	agentName: string;
	/** The functions the agent has available to call */
	functions: LlmFunctions | Array<new () => any>;
	/** The initial prompt */
	initialPrompt: string;
	/** The agent system prompt */
	systemPrompt?: string;
	/** Settings for requiring a human in the loop */
	humanInLoop?: { budget?: number; count?: number };
	/** The LLMs available to use */
	llms: AgentLLMs;
	/** The agent to resume */
	resumeAgentId?: string;
	/** Message to add to the prompt when resuming */
	resumeMessage?: string;
	/** The base path of the context FileSystem. Defaults to the process working directory */
	fileSystemPath?: string;
}

export async function cancelAgent(agentId: string, executionId: string, feedback: string): Promise<void> {
	const agent = await appContext().agentStateService.load(agentId);
	if (agent.executionId !== executionId) throw new Error('Invalid executionId. Agent has already been cancelled/resumed');

	agent.functionCallHistory.push({
		function_name: SUPERVISOR_CANCELLED_FUNCTION_NAME,
		stdout: feedback,
		parameters: {},
	});
	agent.state = 'completed';
	await appContext().agentStateService.save(agent);
}

export async function resumeError(agentId: string, executionId: string, feedback: string): Promise<string> {
	const agent = await appContext().agentStateService.load(agentId);
	if (agent.executionId !== executionId) {
		throw new Error('Invalid executionId. Agent has already been resumed');
	}
	agent.functionCallHistory.push({
		function_name: SUPERVISOR_RESUMED_FUNCTION_NAME,
		stdout: feedback,
		parameters: {},
	});
	agent.error = undefined;
	agent.state = 'agent';
	agent.inputPrompt += `\nSupervisor note: ${feedback}`;
	await appContext().agentStateService.save(agent);
	return runAgent(agent);
}

/**
 * Resume an agent that was in the Human-in-the-loop state
 */
export async function resumeHil(agentId: string, executionId: string, feedback: string): Promise<string> {
	const agent = await appContext().agentStateService.load(agentId);
	if (agent.executionId !== executionId) throw new Error('Invalid executionId. Agent has already been resumed');

	if (feedback.trim().length) {
		agent.functionCallHistory.push({
			function_name: SUPERVISOR_RESUMED_FUNCTION_NAME,
			stdout: feedback,
			parameters: {},
		});
	}
	agent.state = 'agent';
	await appContext().agentStateService.save(agent);
	return runAgent(agent);
}

export async function provideFeedback(agentId: string, executionId: string, feedback: string): Promise<string> {
	const agent = await appContext().agentStateService.load(agentId);
	if (agent.executionId !== executionId) throw new Error('Invalid executionId. Agent has already been provided feedback');

	// The last function call should be the feedback
	const result: FunctionCallResult = agent.functionCallHistory.slice(-1)[0];
	if (result.function_name !== AGENT_REQUEST_FEEDBACK) throw new Error(`Expected the last function call to be ${AGENT_REQUEST_FEEDBACK}`);
	result.stdout = feedback;
	agent.state = 'agent';
	await appContext().agentStateService.save(agent);

	return runAgent(agent);
}

// export async function runAgent2(config: RunAgentConfig): Promise<string> {
// 	return executeAgent(createContext(config))
// }

// export function executeAgent(agent: AgentContext): Promise<string> {
// 	const agentStateService = appCtx().agentStateService;
// }

export async function startAgent(config: RunAgentConfig): Promise<string> {
	const agent: AgentContext = createContext(config);
	// System prompt for the XML function calling autonomous agent
	agent.systemPrompt = readFileSync('src/agent/xml-agent-system-prompt').toString();

	if (config.initialPrompt?.includes('<user_request>')) {
		const startIndex = config.initialPrompt.indexOf('<user_request>') + '<user_request>'.length;
		const endIndex = config.initialPrompt.indexOf('</user_request>');
		agent.inputPrompt = config.initialPrompt;
		agent.userPrompt = config.initialPrompt.slice(startIndex, endIndex);
		logger.debug(`Extracted initial prompt:\n${agent.userPrompt}`);
	} else {
		agent.userPrompt = config.initialPrompt;
		agent.inputPrompt = `<user_request>${config.initialPrompt}</user_request>`;
	}
	await appContext().agentStateService.save(agent);
	return runAgent(agent);
}

export async function runAgent(agent: AgentContext): Promise<string> {
	const agentStateService = appContext().agentStateService;
	agent.state = 'agent';

	agentContextStorage.enterWith(agent);

	// TODO only do this if FileSystem is selected by the user
	// The filesystem will always be on on the context for programmatic usage
	agent.functions.addFunctionInstance(agent.fileSystem, 'FileSystem');

	const agentLLM = llms().hard;

	const userRequestXml = `<user_request>${agent.userPrompt}</user_request>\n`;
	let currentPrompt = agent.inputPrompt;

	const functions = agent.functions;

	const systemPrompt = updateFunctionDefinitions(agent.systemPrompt, getFunctionDefinitions(functions.getFunctionInstances()));
	const functionDefinitions = getFunctionDefinitions(functions.getFunctionInstances());
	const systemPromptWithFunctions = updateFunctionDefinitions(systemPrompt, functionDefinitions);

	// Human in the loop settings
	// How often do we require human input to avoid misguided actions and wasting money
	let hilBudget = agent.hilBudget;
	const hilCount = agent.hilCount;

	// Default to $2 budget to avoid accidents
	if (!hilCount && !hilBudget) {
		logger.info('Default Human in the Loop budget to $2');
		hilBudget = 2;
	}

	let countSinceHil = 0;
	let costSinceHil = 0;
	let previousCost = 0;

	await agentStateService.save(agent);

	await withActiveSpan(agent.name, async (span: Span) => {
		agent.traceId = span.spanContext().traceId;

		span.setAttributes({
			initialPrompt: agent.inputPrompt,
			'service.name': getServiceName(),
			agentId: agent.agentId,
			executionId: agent.executionId,
			parentId: agent.parentAgentId,
			functions: agent.functions.getFunctionClassNames(),
		});

		let shouldContinue = true;
		while (shouldContinue) {
			shouldContinue = await withActiveSpan('XmlAgent', async (span) => {
				let completed = false;
				let requestFeedback = false;
				let anyFunctionCallErrors = false;
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
					logger.debug(`Spent $${costSinceHil.toFixed(2)} since last input. Total cost $${agentContextStorage.getStore().cost.toFixed(2)}`);
					if (hilBudget && costSinceHil > hilBudget) {
						// format costSinceHil to 2 decimal places
						await waitForInput();
						costSinceHil = 0;
					}

					if (!currentPrompt.includes('<function_call_history>')) {
						currentPrompt = buildFunctionCallHistoryPrompt() + buildMemoryPrompt() + currentPrompt;
					}

					let llmResponse: FunctionResponse;
					try {
						llmResponse = await agentLLM.generateTextExpectingFunctions(currentPrompt, systemPromptWithFunctions, { id: 'generateFunctionCalls' });
					} catch (e) {
						const retryPrompt = `${currentPrompt}\nNote: Your previous response did not contain the response in the required format of <response><function_calls>...</function_calls></response>. You must reply in the correct response format.`;
						llmResponse = await agentLLM.generateTextExpectingFunctions(retryPrompt, systemPromptWithFunctions, { id: 'generateFunctionCalls-retryError' });
					}
					currentPrompt = buildFunctionCallHistoryPrompt() + buildMemoryPrompt() + userRequestXml + llmResponse.textResponse;
					const functionCalls = llmResponse.functions.functionCalls;

					if (!functionCalls.length) {
						// Re-try once with an addition to the prompt that there was no function calls,
						// and it should call one of the Agent functions to finish if it's not sure what to do next.
						const retryPrompt = `${currentPrompt}
						Note: Your previous response did not contain a function call.  If you are able to answer/complete the question/task, then call the ${AGENT_COMPLETED_NAME} function with the appropriate response.
						If you are unsure what to do next then call the ${AGENT_REQUEST_FEEDBACK} function with a clarifying question.`;
						const functionCallResponse: FunctionResponse = await agentLLM.generateTextExpectingFunctions(retryPrompt, systemPromptWithFunctions, {
							id: 'generateFunctionCalls-retryNoFunctions',
						});
						// retrying
						currentPrompt = buildFunctionCallHistoryPrompt() + buildMemoryPrompt() + userRequestXml + functionCallResponse.textResponse;
						const functionCalls = functionCallResponse.functions.functionCalls;
						if (!functionCalls.length) {
							throw new Error('Found no function invocations');
						}
					}

					agent.state = 'functions';
					agent.inputPrompt = currentPrompt;
					agent.invoking.push(...functionCalls);
					await agentStateService.save(agent);

					const functionResults = [];

					for (const functionCall of functionCalls) {
						try {
							const functionResponse: any = await functions.callFunction(functionCall);
							let functionResult = agentLLM.formatFunctionResult(functionCall.function_name, functionResponse);
							if (functionResult.startsWith('<response>')) functionResult = functionResult.slice(10);
							// The trailing </response> will be removed as it's a stop word for the LLMs
							functionResults.push(agentLLM.formatFunctionResult(functionCall.function_name, functionResponse));
							const functionResponseString = JSON.stringify(functionResponse);

							// To minimise the function call history size becoming too large (i.e. expensive)
							// we'll create a summary for responses which are quite long
							const outputSummary =
								functionResponse?.functionResponseString?.length > FUNCTION_OUTPUT_SUMMARIZE_LENGTH
									? await summariseLongFunctionOutput(functionResponse)
									: undefined;

							agent.functionCallHistory.push({
								function_name: functionCall.function_name,
								parameters: functionCall.parameters,
								stdout: JSON.stringify(functionResponse),
								stdoutSummary: outputSummary,
							});
							// Should check if completed or requestFeedback then there's no more function calls
							if (functionCall.function_name === AGENT_COMPLETED_NAME) {
								logger.info('Task completed');
								agent.state = 'completed';
								completed = true;
								break;
							}
							if (functionCall.function_name === AGENT_REQUEST_FEEDBACK) {
								logger.info('Feedback requested');
								agent.state = 'feedback';
								requestFeedback = true;
								break;
							}
						} catch (e) {
							anyFunctionCallErrors = true;
							agent.state = 'error';
							logger.error(e, 'Function error');
							agent.error = e.toString();
							await agentStateService.save(agent);
							functionResults.push(agentLLM.formatFunctionError(functionCall.function_name, e));
							// currentPrompt += `\n${llm.formatFunctionError(functionCalls.function_name, e)}`;

							agent.functionCallHistory.push({
								function_name: functionCall.function_name,
								parameters: functionCall.parameters,
								stderr: agent.error,
							});
							// How to handle function call errors? Give the agent a chance to re-try or try something different, or always human in loop?
						}
					}
					// Function invocations are complete
					span.setAttribute('functionCalls', functionCalls.map((functionCall) => functionCall.function_name).join(', '));

					// This section is duplicated in the provideFeedback function
					agent.invoking = [];
					if (!anyFunctionCallErrors && !completed && !requestFeedback) agent.state = 'agent';
					currentPrompt = `${userRequestXml}\n${llmResponse.textResponse}\n${functionResults.join('\n')}`;
					agent.inputPrompt = currentPrompt;
					await agentStateService.save(agent);
				} catch (e) {
					span.setStatus({ code: SpanStatusCode.ERROR, message: e.toString() });
					logger.error(e, 'Control loop error');
					controlError = true;
					agent.state = 'error';
					agent.error = e.toString();
					agent.inputPrompt = currentPrompt;
					await agentStateService.save(agent);
				}
				// return if the control loop should continue
				return !(completed || requestFeedback || anyFunctionCallErrors || controlError);
			});
		}

		// Send notification message
		const uiUrl = envVar('UI_URL');
		let message = notificationMessage(agent);
		message += `\n${uiUrl}/agent/${agent.agentId}`;
		logger.info(message);

		const slackConfig = agent.user.functionConfig[Slack.name];
		// TODO check for env vars
		if (slackConfig?.webhookUrl || slackConfig?.token) {
			try {
				await new Slack().sendMessage(message);
			} catch (e) {
				logger.error(e, 'Failed to send supervisor notification message');
			}
		}
	});
	return agent.agentId;
}

async function summariseLongFunctionOutput(functionResult: FunctionCallResult): Promise<string> {
	const errorPrefix = functionResult.stderr ? 'error-' : '';
	const prompt = `<function_name>${functionResult.function_name}</function_name><${errorPrefix}output>\n${
		functionResult.stdout ?? functionResult.stderr
	}</${errorPrefix}output>
	For the above function call summarise the output into a paragraph that captures key details about the output content, which might include identifiers, content summary, content structure and examples. Only responsd with the summary`;
	return await llms().easy.generateText(prompt, null, { id: 'summariseLongFunctionOutput' });
}

function notificationMessage(agent: AgentContext): string {
	switch (agent.state) {
		case 'error':
			return `Agent error.\nName:${agent.name}\nError: ${agent.error}`;
		case 'hil':
			return `Agent has reached Human-in-the-loop threshold.\nName: ${agent.name}`;
		case 'feedback':
			return `Agent has requested feedback.\nName: ${agent.name}\n:Question: ${getLastFunctionCallArg(agent)}`;
		case 'completed':
			return `Agent has completed.\nName: ${agent.name}\nNote: ${getLastFunctionCallArg(agent)}`;
		default:
	}
}

function getLastFunctionCallArg(agent: AgentContext) {
	const result: FunctionCallResult = agent.functionCallHistory.slice(-1)[0];
	return Object.values(result.parameters)[0];
}

class HumanInLoopReturn extends Error {}

/**
 * Adding a human in the loop, so it doesn't consume all of your budget
 */

async function waitForInput() {
	const span = startSpan('humanInLoop');

	await appContext().agentStateService.updateState(agentContextStorage.getStore(), 'hil');

	// Beep beep!
	process.stdout.write('\u0007');
	await sleep(100);
	process.stdout.write('\u0007');

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
