import { readFileSync } from 'fs';
import { Span, SpanStatusCode } from '@opentelemetry/api';
import { PyodideInterface, loadPyodide } from 'pyodide';
import { AGENT_COMPLETED_NAME, AGENT_REQUEST_FEEDBACK, AGENT_SAVE_MEMORY_CONTENT_PARAM_NAME } from '#agent/agentFunctions';
import { buildFunctionCallHistoryPrompt, buildMemoryPrompt, buildToolStatePrompt, updateFunctionSchemas } from '#agent/agentPromptUtils';
import { formatFunctionError, formatFunctionResult, notificationMessage } from '#agent/agentRunner';
import { agentHumanInTheLoop, notifySupervisor } from '#agent/humanInTheLoop';
import { getServiceName } from '#fastify/trace-init/trace-init';
import {FUNC_SEP, FunctionParameter, FunctionSchema, getAllFunctionSchemas} from '#functionSchema/functions';
import { logger } from '#o11y/logger';
import { withActiveSpan } from '#o11y/trace';
import { envVar } from '#utils/env-var';
import { errorToString } from '#utils/errors';
import { appContext } from '../app';
import { AgentContext, agentContext, agentContextStorage, llms } from './agentContext';

const stopSequences = ['</response>'];

export const PY_AGENT_SPAN = 'PythonAgent';

let pyodide: PyodideInterface;

export async function runPythonAgent(agent: AgentContext): Promise<string> {
	if (!pyodide) pyodide = await loadPyodide();

	// Hot reload (TODO only when not deployed)
	const pythonSystemPrompt = readFileSync('src/agent/python-agent-system-prompt').toString();

	const agentStateService = appContext().agentStateService;
	agent.state = 'agent';

	agentContextStorage.enterWith(agent);

	const agentLLM = llms().hard;

	const userRequestXml = `<user_request>\n${agent.userPrompt}\n</user_request>`;
	let currentPrompt = agent.inputPrompt;
	// logger.info(`userRequestXml ${userRequestXml}`)
	logger.info(`currentPrompt ${currentPrompt}`);

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

		let functionErrorCount = 0;

		let currentFunctionHistorySize = agent.functionCallHistory.length;

		let shouldContinue = true;
		while (shouldContinue) {
			shouldContinue = await withActiveSpan(PY_AGENT_SPAN, async (span) => {
				// Might need to reload the agent for dynamic updating of the tools
				const functionsXml = convertJsonToPythonDeclaration(getAllFunctionSchemas(agent.functions.getFunctionInstances()));
				const systemPromptWithFunctions = updateFunctionSchemas(pythonSystemPrompt, functionsXml);

				let completed = false;
				let requestFeedback = false;
				const anyFunctionCallErrors = false;
				let controlError = false;
				try {
					if (hilCount && countSinceHil === hilCount) {
						await agentHumanInTheLoop(`Agent control loop has performed ${hilCount} iterations`);
						countSinceHil = 0;
					}
					countSinceHil++;

					logger.debug(`Budget remaining $${agent.budgetRemaining.toFixed(2)}. Total cost $${agentContextStorage.getStore().cost.toFixed(2)}`);
					if (hilBudget && agent.budgetRemaining <= 0) {
						// HITL happens once budget is exceeded, which may be more than the allocated budget
						const increase = agent.hilBudget - agent.budgetRemaining;
						await agentHumanInTheLoop(`Agent cost has increased by USD\$${increase.toFixed(2)}. Increase budget by $${agent.hilBudget}`);
						agent.budgetRemaining = agent.hilBudget;
					}

					const toolStatePrompt = await buildToolStatePrompt();

					// If the last function was requestFeedback then we'll remove it from function history add it as function results
					let historyToIndex = agent.functionCallHistory.length ? agent.functionCallHistory.length - 1 : 0;
					let requestFeedbackCallResult = '';
					if (agent.functionCallHistory.length && agent.functionCallHistory.at(-1).function_name === AGENT_REQUEST_FEEDBACK) {
						historyToIndex--;
						requestFeedbackCallResult = buildFunctionCallHistoryPrompt('results', 10000, historyToIndex + 1, historyToIndex + 2);
					}
					const oldFunctionCallHistory = buildFunctionCallHistoryPrompt('history', 10000, 0, historyToIndex);

					const isNewAgent = agent.iterations === 0 && agent.functionCallHistory.length === 0;
					// For the initial prompt we create the empty memory, functional calls and default tool state content. Subsequent iterations already have it
					const initialPrompt = isNewAgent
						? oldFunctionCallHistory + buildMemoryPrompt() + toolStatePrompt + currentPrompt
						: currentPrompt + requestFeedbackCallResult;

					const agentPlanResponse: string = await agentLLM.generateText(initialPrompt, systemPromptWithFunctions, {
						id: 'dynamicAgentPlan',
						stopSequences,
					});

					const llmPythonCode = extractPythonCode(agentPlanResponse);

					agent.state = 'functions';
					await agentStateService.save(agent);

					// The XML formatted results of the function call(s)
					const functionResults: string[] = [];
					let pythonScriptResult: any;
					let pythonScript = '';

					const functionInstances = agent.functions.getFunctionInstanceMap();
					const schemas: FunctionSchema[] = getAllFunctionSchemas(Object.values(functionInstances));
					const jsGlobals = {};
					for (const schema of schemas) {
						const [className, method] = schema.name.split(FUNC_SEP);
						jsGlobals[schema.name] = async (...args) => {
							// Convert arg array to parameters name/value map
							const parameters: { [key: string]: any } = {};
							for (let index = 0; index < args.length; index++) parameters[schema.parameters[index].name] = args[index];

							try {
								const functionResponse = await functionInstances[className][method](...args);
								// To minimise the function call history size becoming too large (i.e. expensive)
								// we'll create a summary for responses which are quite long
								// const outputSummary = await summariseLongFunctionOutput(functionResponse)

								// Don't need to duplicate the content in the function call history
								// TODO Would be nice to save over-written memory keys for history/debugging
								let stdout = JSON.stringify(functionResponse);
								if (className === 'Agent' && method === 'saveMemory') parameters[AGENT_SAVE_MEMORY_CONTENT_PARAM_NAME] = '(See <memory> entry)';
								if (className === 'Agent' && method === 'getMemory') stdout = '(See <memory> entry)';

								agent.functionCallHistory.push({
									function_name: schema.name,
									parameters,
									stdout,
									// stdoutSummary: outputSummary, TODO
								});
								functionResults.push(formatFunctionResult(schema.name, functionResponse));
								return functionResponse;
							} catch (e) {
								functionResults.push(formatFunctionError(schema.name, e));

								agent.functionCallHistory.push({
									function_name: schema.name,
									parameters,
									stderr: errorToString(e, false),
									// stderrSummary: outputSummary, TODO
								});
								throw e;
							}
						};
					}
					const globals = pyodide.toPy(jsGlobals);

					pyodide.setStdout({
						batched: (output) => {
							logger.info(`Script stdout: ${JSON.stringify(output)}`);
						},
					});
					pyodide.setStderr({
						batched: (output) => {
							logger.info(`Script stderr: ${JSON.stringify(output)}`);
						},
					});

					const allowedImports = ['json', 're', 'math', 'datetime'];
					// Add the imports from the allowed packages being used in the script
					pythonScript = allowedImports
						.filter((pkg) => llmPythonCode.includes(`${pkg}.`))
						.map((pkg) => `import ${pkg}\n`)
						.join();

					pythonScript += `
from typing import List, Dict, Tuple, Optional, Union

async def main():
${llmPythonCode
	.split('\n')
	.map((line) => `    ${line}`)
	.join('\n')}

str(await main())`.trim();

					try {
						try {
							// Initial execution attempt
							const result = await pyodide.runPythonAsync(pythonScript, { globals });
							pythonScriptResult = result?.toJs ? result.toJs() : result;
							pythonScriptResult = pythonScriptResult?.toString ? pythonScriptResult.toString() : pythonScriptResult;
							logger.info(pythonScriptResult, 'Script result');
							if (result?.destroy) result.destroy();
						} catch (e) {
							// Attempt to fix Syntax/indentation errors and retry
							// Otherwise let execution errors re-throw.
							if (e.type !== 'IndentationError' && e.type !== 'SyntaxError') throw e;

							// Fix the compile issues in the script
							const prompt = `${functionsXml}\n<python>\n${pythonScript}</python>\n<error>${e.message}</error>\nPlease adjust/reformat the Python script to fix the issue. Output only the updated code. Do no chat, do not output markdown ticks. Only the updated code.`;
							pythonScript = await llms().hard.generateText(prompt, null, { id: 'Fix python script error' });

							// Re-try execution of fixed syntax/indentation error
							const result = await pyodide.runPythonAsync(pythonScript, { globals });
							pythonScriptResult = result?.toJs ? result.toJs() : result;
							pythonScriptResult = pythonScriptResult?.toString ? pythonScriptResult.toString() : pythonScriptResult;

							if (result?.destroy) result.destroy();
							logger.info(pythonScriptResult, 'Script result');
						}

						const lastFunctionCall = agent.functionCallHistory[agent.functionCallHistory.length - 1];

						// Should force completed/requestFeedback to exit the script - throw a particular Error class
						if (lastFunctionCall.function_name === AGENT_COMPLETED_NAME) {
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
					} catch (e) {
						logger.info(`Caught function error ${e.message}`);
						functionErrorCount++;
					}
					// Function invocations are complete
					// span.setAttribute('functionCalls', pythonCode.map((functionCall) => functionCall.function_name).join(', '));

					// The agent should store important values in memory
					// functionResults

					// This section is duplicated in the provideFeedback function
					agent.invoking = [];
					const currentFunctionCallHistory = buildFunctionCallHistoryPrompt('results', 10000, currentFunctionHistorySize);

					currentPrompt = `${oldFunctionCallHistory}${buildMemoryPrompt()}${toolStatePrompt}\n${userRequestXml}\n${agentPlanResponse}\n${currentFunctionCallHistory}\n<python-result>${pythonScriptResult}</python-result>\nReview the results of the scripts and make any observations about the output/errors, then proceed with the response.`;
					currentFunctionHistorySize = agent.functionCallHistory.length;
				} catch (e) {
					span.setStatus({ code: SpanStatusCode.ERROR, message: e.toString() });
					logger.error(e, 'Control loop error');
					controlError = true;
					agent.state = 'error';
					agent.error = errorToString(e);
				} finally {
					agent.inputPrompt = currentPrompt;
					agent.callStack = [];
					agent.iterations++;
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

		try {
			await notifySupervisor(agent, message);
		} catch (e) {
			logger.warn(e`Failed to send supervisor notification message ${message}`);
		}
	});
	return agent.agentId; //{ agentId: agent.agentId, execution };
}

/**
 * Converts the JSON function schemas to Python function declarations with docString
 * @param jsonDefinitions The JSON object containing function schemas
 * @returns A string containing the functions
 */
function convertJsonToPythonDeclaration(jsonDefinitions: FunctionSchema[]): string {
	let functions = '<functions>';

	for (const def of jsonDefinitions) {
		functions += `
fun ${def.name}(${def.parameters.map((p) => `${p.name}: ${p.optional ? `Optional[${type(p)}]` : type(p)}`).join(', ')})
    """
    ${def.description}

    Args:
        ${def.parameters.map((p) => `${p.name} (${p.optional ? `Optional[${type(p)}]` : type(p)}) -- ${p.description}`).join('\n        ')}
    ${def.returns ? `\nReturns:\n        ${def.returns}\n    """` : '"""'}
	`;
	}
	functions += '\n</functions>';
	return functions;
}

export function convertTypeScriptToPython(tsType: string): string {
	const typeMappings: { [key: string]: string } = {
		string: 'str',
		number: 'float',
		boolean: 'bool',
		any: 'Any',
		void: 'None',
		undefined: 'None',
		null: 'None',
		// Include generics mapping as well
		'Array<': 'List<',
	};

	let pyType = tsType;

	for (const [tsType, pyTypeEquivalent] of Object.entries(typeMappings)) {
		const regex = new RegExp(`\\b${tsType}\\b`, 'g'); // Boundary to match whole words
		pyType = pyType.replace(regex, pyTypeEquivalent);
	}
	return pyType;
}

function type(param: FunctionParameter): string {
	return convertTypeScriptToPython(param.type);
}

/**
 * Extracts the text within <python-code></python-code> tags
 * @param llmResponse response from the LLM
 */
export function extractPythonCode(llmResponse: string): string {
	const index = llmResponse.lastIndexOf('<python-code>');
	if (index < 0) throw new Error('Could not find <python-code> in response');
	const resultText = llmResponse.slice(index);
	const regexXml = /<python-code>(.*)<\/python-code>/is;
	const matchXml = regexXml.exec(resultText);

	if (!matchXml) throw new Error(`Could not find <python-code></python-code> in the response \n${resultText}`);

	return matchXml[1].trim();
}
