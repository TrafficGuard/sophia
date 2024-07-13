import { readFileSync } from 'fs';
import * as readline from 'readline';
import { Span, SpanStatusCode } from '@opentelemetry/api';
import { loadPyodide } from 'pyodide';
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
import { FunctionDefinition, getAllFunctionDefinitions } from '../functionDefinition/functions';
import { LlmFunctions } from './LlmFunctions';
import { AgentContext, AgentLLMs, agentContext, agentContextStorage, createContext, llms } from './agentContext';

// ===========================================================
//   !! PYODIDE AGENT IS EXPERIMENTAL !!
// ===========================================================

export const SUPERVISOR_RESUMED_FUNCTION_NAME = 'Supervisor.Resumed';
export const SUPERVISOR_CANCELLED_FUNCTION_NAME = 'Supervisor.Cancelled';

const FUNCTION_OUTPUT_SUMMARIZE_LENGTH = 2000;

const stopSequences = ['</response>'];

export interface RunAgentConfig {
	/** Uses currentUser() if not provided */
	user?: User;
	/** The name of this agent */
	agentName: string;
	/** The type of autonomous agent function calling */
	type: 'xml' | 'python';
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

/**
 * The reference to a running agent
 */
interface AgentExecution {
	agentId: string;
	execution: Promise<any>;
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

export async function resumeError(agentId: string, executionId: string, feedback: string): Promise<void> {
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
	await runPyodideAgent(agent);
}

/**
 * Resume an agent that was in the Human-in-the-loop state
 */
export async function resumeHil(agentId: string, executionId: string, feedback: string): Promise<void> {
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
	await runPyodideAgent(agent);
}

/**
 * Restart an agent that was in the completed state
 */
export async function resumeCompleted(agentId: string, executionId: string, instructions: string): Promise<void> {
	const agent = await appContext().agentStateService.load(agentId);
	if (agent.executionId !== executionId) throw new Error('Invalid executionId. Agent has already been resumed');

	if (instructions.trim().length) {
		agent.functionCallHistory.push({
			function_name: SUPERVISOR_RESUMED_FUNCTION_NAME,
			stdout: instructions,
			parameters: {},
		});
	}
	agent.state = 'agent';
	agent.inputPrompt += `\nSupervisor note: The agent has been resumed from the completed state with the following instructions: ${instructions}`;
	await appContext().agentStateService.save(agent);
	await runPyodideAgent(agent);
}

export async function provideFeedback(agentId: string, executionId: string, feedback: string): Promise<void> {
	const agent = await appContext().agentStateService.load(agentId);
	if (agent.executionId !== executionId) throw new Error('Invalid executionId. Agent has already been provided feedback');

	// The last function call should be the feedback
	const result: FunctionCallResult = agent.functionCallHistory.slice(-1)[0];
	if (result.function_name !== AGENT_REQUEST_FEEDBACK) throw new Error(`Expected the last function call to be ${AGENT_REQUEST_FEEDBACK}`);
	result.stdout = feedback;
	agent.state = 'agent';
	await appContext().agentStateService.save(agent);

	await runPyodideAgent(agent);
}

// export async function runAgent2(config: RunAgentConfig): Promise<string> {
// 	return executeAgent(createContext(config))
// }

// export function executeAgent(agent: AgentContext): Promise<string> {
// 	const agentStateService = appCtx().agentStateService;
// }

export async function startPyodideAgent(pyConfig: Omit<RunAgentConfig, 'type'>): Promise<string> {
	const config: RunAgentConfig = { type: 'python', ...pyConfig };
	const agent: AgentContext = createContext(config);
	// System prompt for the XML function calling autonomous agent
	agent.systemPrompt = readFileSync('src/agent/pyodide-agent-system-prompt').toString();

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
	logger.info(`Created agent ${agent.agentId}`);
	return runPyodideAgent(agent);
}

export async function runPyodideAgent(agent: AgentContext): Promise<string> {
	// 	const agentExecution = await runAgentWithExecution(agent);
	// 	await agentExecution.execution;
	// 	return agentExecution.agentId;
	// }
	//
	// export async function runAgentWithExecution(agent: AgentContext): Promise<AgentExecution> {
	const agentStateService = appContext().agentStateService;
	agent.state = 'agent';

	agentContextStorage.enterWith(agent);

	const agentLLM = llms().hard;

	const userRequestXml = `<user_request>${agent.userPrompt}</user_request>\n`;
	let currentPrompt = agent.inputPrompt;

	const functions = agent.functions;

	const functionsXml = convertJsonToPythonDeclaration(getAllFunctionDefinitions(functions.getFunctionInstances()));
	const systemPromptWithFunctions = updateFunctionDefinitions(agent.systemPrompt, functionsXml);

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

					let llmResponse: string;
					try {
						llmResponse = await agentLLM.generateText(currentPrompt, systemPromptWithFunctions, {
							id: 'generateFunctionCalls',
							stopSequences,
						});
					} catch (e) {
						const retryPrompt = `${currentPrompt}\nNote: Your previous response did not contain the response in the required format of <response><function_calls>...</function_calls></response>. You must reply in the correct response format.`;
						llmResponse = await agentLLM.generateText(retryPrompt, systemPromptWithFunctions, {
							id: 'generateFunctionCalls-retryError',
							stopSequences,
						});
					}
					currentPrompt = buildFunctionCallHistoryPrompt() + buildMemoryPrompt() + userRequestXml + llmResponse;
					const pythonCode = extractPythonCode(llmResponse);

					if (!pythonCode.length) {
						throw new Error('Found no python code found');
					}

					agent.state = 'functions';
					agent.inputPrompt = currentPrompt;
					agent.invoking = pythonCode;
					await agentStateService.save(agent);

					const functionResults = [];
					let pythonScriptResult: any;
					let pyodideError: Error | undefined;
					let pythonScript: string | undefined;
					const pyodide = await loadPyodide();

					const functionInstances = agent.functions.getFunctionInstanceMap();
					const defs = getAllFunctionDefinitions(Object.values(functionInstances));
					const jsGlobals = {};
					for (const def of defs) {
						const [className, method] = def.name.split('.');
						jsGlobals[def.name.replace('.', '_')] = async (...args) => {
							// agent.invoking.push()
							try {
								const functionResponse = await functionInstances[className][method](...args);
								// To minimise the function call history size becoming too large (i.e. expensive)
								// we'll create a summary for responses which are quite long
								const outputSummary =
									functionResponse?.functionResponseString?.length > FUNCTION_OUTPUT_SUMMARIZE_LENGTH
										? await summariseLongFunctionOutput(functionResponse)
										: undefined;

								agent.functionCallHistory.push({
									function_name: def.name,
									parameters: args, // TODO map to key/value from param definitions
									stdout: JSON.stringify(functionResponse),
									stdoutSummary: outputSummary,
								});
								functionResults.push(agentLLM.formatFunctionResult(def.name, functionResponse));
							} catch (e) {
								anyFunctionCallErrors = true;
								agent.state = 'error';
								logger.error(e, 'Function error');
								agent.error = e.toString();
								await agentStateService.save(agent);
								functionResults.push(agentLLM.formatFunctionError(def.name, e));
								// currentPrompt += `\n${llm.formatFunctionError(functionCalls.function_name, e)}`;

								agent.functionCallHistory.push({
									function_name: def.name,
									parameters: args, // TODO map to key/value from param definitions
									stderr: agent.error,
								});
								throw e;
							}
						};
					}
					const globals = pyodide.toPy(jsGlobals);
					try {
						pythonScript = `
async def main():
${pythonCode}
main()`;
						logger.info(pythonScript);
						console.log('Original');
						console.log(pythonScript);
						pythonScript = await llms().hard.generateText(
							`${pythonScript}\n\nPlease format this Python script correctly with 4 spaces for an indent. Output only the re-formatted script. Do not chat, do not output markdown ticks. Only the code`,
							null,
							{ id: 'Reformat Python script' },
						);
						console.log('Formatted');
						console.log(pythonScript);
						const result = await pyodide.runPythonAsync(pythonScript, { globals });
						pythonScriptResult = result?.toJs ? result.toJs() : result;
						logger.info(pythonScriptResult, 'pyodide result');
					} catch (e) {
						pyodideError = e;
						logger.error(`Pyodide error ${e.message}`);
						logger.error(e);

						const prompt = `${functionsXml}\n<python>\n${pythonScript}</python>\n<error>${e.message}</error>\nPlease adjust/reformat the Python script to fix the issue. Output only the updated code. Do no chat, do not output markdown ticks. Only the updated code.`;
						pythonScript = await llms().hard.generateText(prompt, null, { id: 'Fix python script error' });
						console.log('Fixed? script');
						console.log(pythonScript);
						const result = await pyodide.runPythonAsync(pythonScript, { globals });
						pythonScriptResult = result?.toJs ? result.toJs() : result;
						logger.info(pythonScriptResult, 'pyodide result');
					}

					const lastFunctionCall = agent.functionCallHistory[agent.functionCallHistory.length - 1];

					// Should check if completed or requestFeedback then there's no more function calls
					if (pyodideError) {
					} else if (lastFunctionCall.function_name === AGENT_COMPLETED_NAME) {
						logger.info('Task completed');
						agent.state = 'completed';
						completed = true;
					} else if (lastFunctionCall.function_name === AGENT_REQUEST_FEEDBACK) {
						logger.info('Feedback requested');
						agent.state = 'feedback';
						requestFeedback = true;
					} else {
						if (!anyFunctionCallErrors && !completed && !requestFeedback) agent.state = 'agent';
					}

					// Function invocations are complete
					// span.setAttribute('functionCalls', pythonCode.map((functionCall) => functionCall.function_name).join(', '));

					// This section is duplicated in the provideFeedback function
					agent.invoking = [];
					currentPrompt = `${userRequestXml}\n${llmResponse}\n<python-result>${pythonScriptResult}</python-result>`;
					agent.inputPrompt = currentPrompt;
					await agentStateService.save(agent);
				} catch (e) {
					span.setStatus({ code: SpanStatusCode.ERROR, message: e.toString() });
					logger.error(e, 'Control loop error');
					controlError = true;
					agent.state = 'error';
					agent.error = e.message;
					if (e.stack) agent.error += `\n${e.stack}`;
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
	return agent.agentId; //{ agentId: agent.agentId, execution };
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

/**
 * Converts the JSON function definitions to Python function declarations with docString
 * @param jsonDefinitions The JSON object containing function definitions
 * @returns A string containing the functions
 */
function convertJsonToPythonDeclaration(jsonDefinitions: FunctionDefinition[]): string {
	let functions = '<functions>';

	for (const def of jsonDefinitions) {
		functions += `
fun ${def.name.replace('.', '_')}(${def.parameters.map((p) => `${p.name}: ${p.optional ? `Optional[${p.type}]` : p.type}`).join(', ')})
    """
    ${def.description}

    Args:
        ${def.parameters.map((p) => `${p.name} (${p.optional ? `Optional[${p.type}]` : p.type}) -- ${p.description}`).join('\n        ')}
    ${def.returns ? `\nReturns:\n        ${def.returns}\n    """` : '"""'}
	`;
	}
	functions += '\n</functions>';
	return functions;
}

/**
 * Extracts the text within <python-code></python-code> tags
 * @param response response from the LLM
 */
export function extractPythonCode(response: string): any {
	const index = response.lastIndexOf('<python-code>');
	if (index < 0) throw new Error('Could not find <python-code> in response');
	const resultText = response.slice(index);
	const regexXml = /<python-code>(.*)<\/python-code>/is;
	const matchXml = regexXml.exec(resultText);

	if (!matchXml) throw new Error(`Could not find <python-code></python-code> in the response \n${resultText}`);

	return matchXml[1].trim();
}
