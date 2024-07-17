import { readFileSync } from 'fs';
import { Span, SpanStatusCode } from '@opentelemetry/api';
import { PyodideInterface, loadPyodide } from 'pyodide';
import { AGENT_COMPLETED_NAME, AGENT_REQUEST_FEEDBACK } from '#agent/agentFunctions';
import { buildFileSystemPrompt, buildFunctionCallHistoryPrompt, buildMemoryPrompt, updateFunctionSchemas } from '#agent/agentPromptUtils';
import { formatFunctionError, formatFunctionResult, notificationMessage } from '#agent/agentRunner';
import { agentHumanInTheLoop, notifySupervisor } from '#agent/humanInTheLoop';
import { getServiceName } from '#fastify/trace-init/trace-init';
import { FunctionParameter, FunctionSchema, getAllFunctionSchemas } from '#functionSchema/functions';
import { logger } from '#o11y/logger';
import { withActiveSpan } from '#o11y/trace';
import { envVar } from '#utils/env-var';
import { appContext } from '../app';
import { AgentContext, agentContext, agentContextStorage, llms } from './agentContext';

const stopSequences = ['</response>'];

const pythonSystemPrompt = readFileSync('src/agent/python-agent-system-prompt').toString();

let pyodide: PyodideInterface;

export async function runPythonAgent(agent: AgentContext): Promise<string> {
	if (!pyodide) pyodide = await loadPyodide();

	const agentStateService = appContext().agentStateService;
	agent.state = 'agent';

	agentContextStorage.enterWith(agent);

	const agentLLM = llms().hard;

	const userRequestXml = `<user_request>\n${agent.userPrompt}\n</user_request>\n`;
	let currentPrompt = agent.inputPrompt;

	const functions = agent.functions;

	const functionsXml = convertJsonToPythonDeclaration(getAllFunctionSchemas(functions.getFunctionInstances()));
	const systemPromptWithFunctions = updateFunctionSchemas(pythonSystemPrompt, functionsXml);

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
			shouldContinue = await withActiveSpan('PythonAgent', async (span) => {
				let completed = false;
				let requestFeedback = false;
				let anyFunctionCallErrors = false;
				let controlError = false;
				try {
					if (hilCount && countSinceHil === hilCount) {
						await agentHumanInTheLoop(`Agent control loop has performed ${hilCount} iterations`);
						countSinceHil = 0;
					}
					countSinceHil++;

					const newCosts = agentContext().cost - previousCost;
					if (newCosts) logger.debug(`New costs $${newCosts.toFixed(2)}`);
					previousCost = agentContext().cost;
					costSinceHil += newCosts;
					logger.debug(`Spent $${costSinceHil.toFixed(2)} since last input. Total cost $${agentContextStorage.getStore().cost.toFixed(2)}`);
					if (hilBudget && costSinceHil > hilBudget) {
						await agentHumanInTheLoop(`Agent cost has increased by USD\$${costSinceHil.toFixed(2)}`);
						costSinceHil = 0;
					}

					if (!currentPrompt.includes('<function_call_history>')) {
						currentPrompt = buildFunctionCallHistoryPrompt() + buildMemoryPrompt() + buildFileSystemPrompt() + currentPrompt;
					}

					const llmResponse: string = await agentLLM.generateText(currentPrompt, systemPromptWithFunctions, {
						id: 'generateFunctionCalls',
						stopSequences,
					});

					const pythonCode = extractPythonCode(llmResponse);

					currentPrompt = buildFunctionCallHistoryPrompt() + buildMemoryPrompt() + buildFileSystemPrompt() + userRequestXml + llmResponse;

					agent.state = 'functions';
					agent.inputPrompt = currentPrompt;
					agent.invoking = []; // pythonCode
					await agentStateService.save(agent);

					const functionResults = [];
					let pythonScriptResult: any;
					let pyodideError: Error | undefined;
					let pythonScript: string | undefined;

					const functionInstances = agent.functions.getFunctionInstanceMap();
					const defs = getAllFunctionSchemas(Object.values(functionInstances));
					const jsGlobals = {};
					for (const def of defs) {
						const [className, method] = def.name.split('.');
						jsGlobals[def.name.replace('.', '_')] = async (...args) => {
							// agent.invoking.push()
							try {
								const functionResponse = await functionInstances[className][method](...args);
								// To minimise the function call history size becoming too large (i.e. expensive)
								// we'll create a summary for responses which are quite long
								// const outputSummary = await summariseLongFunctionOutput(functionResponse)

								agent.functionCallHistory.push({
									function_name: def.name,
									parameters: args, // TODO map to key/value from param definitions
									stdout: JSON.stringify(functionResponse),
									// stdoutSummary: outputSummary,
								});
								functionResults.push(formatFunctionResult(def.name, functionResponse));
								return functionResponse;
							} catch (e) {
								anyFunctionCallErrors = true;
								agent.state = 'error';
								logger.error(e, 'Function error');
								agent.error = e.toString();
								await agentStateService.save(agent);
								functionResults.push(formatFunctionError(def.name, e));
								// currentPrompt += `\n${llm.formatFunctionError(functionCalls.function_name, e)}`;

								agent.functionCallHistory.push({
									function_name: def.name,
									parameters: args, // TODO map to key/value from param schema
									stderr: agent.error,
								});
								throw e;
							}
						};
					}
					const globals = pyodide.toPy(jsGlobals);
					// Could optimise the imports by checking what the llm generated code uses
					// The available imports is defined in the system prompt
					try {
						pythonScript = `
import json
import re
import math
import datetime
from typing import List, Dict, Tuple, Optional, Union

async def main():
${pythonCode
	.split('\n')
	.map((line) => `    ${line}`)
	.join('\n')}

main()`.trim();
						// logger.info(pythonScript);
						// console.log('Original');

						// pythonScript = await llms().medium.generateText(
						// 	`${pythonScript}\n\nPlease format this Python script correctly with 4 spaces for an indent. Output only the re-formatted script. Do not chat, do not output markdown ticks, etc. Only the code`,
						// 	null,
						// 	{ id: 'Reformat Python script' },
						// );
						// console.log('Formatted');
						// console.log(pythonScript);
						logger.flush();
						console.log(pythonScript);

						// IndentationError

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
						const result = await pyodide.runPythonAsync(pythonScript, { globals });
						pythonScriptResult = result?.toJs ? result.toJs() : result;
						logger.info(pythonScriptResult, 'pyodide result');
						if (result?.destroy) result.destroy();
					} catch (e) {
						pyodideError = e;
						logger.error(`Pyodide error ${e.message}`);
						logger.error(e);

						const prompt = `${functionsXml}\n<python>\n${pythonScript}</python>\n<error>${e.message}</error>\nPlease adjust/reformat the Python script to fix the issue. Output only the updated code. Do no chat, do not output markdown ticks. Only the updated code.`;
						pythonScript = await llms().hard.generateText(prompt, null, { id: 'Fix python script error' });
						// console.log('Fixed? script');
						// console.log(pythonScript);
						try {
							const result = await pyodide.runPythonAsync(pythonScript, { globals });
							pythonScriptResult = result?.toJs ? result.toJs() : result;
							if (result?.destroy) result.destroy();
							logger.info(pythonScriptResult, 'pyodide result');
						} catch (e) {
							const error = new Error(`Error executing script:\n${pythonScript}`);
							error.stack = e.stack;
						}
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
				} catch (e) {
					span.setStatus({ code: SpanStatusCode.ERROR, message: e.toString() });
					logger.error(e, 'Control loop error');
					controlError = true;
					agent.state = 'error';
					agent.error = e.message;
					if (e.stack) agent.error += `\n${e.stack}`;
				} finally {
					agent.inputPrompt = currentPrompt;
					agent.callStack = [];
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
fun ${def.name.replace('.', '_')}(${def.parameters.map((p) => `${p.name}: ${p.optional ? `Optional[${type(p)}]` : type(p)}`).join(', ')})
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
