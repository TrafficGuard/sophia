import { readFileSync } from 'fs';
import { Span, SpanStatusCode } from '@opentelemetry/api';
import { AGENT_COMPLETED_NAME, AGENT_REQUEST_FEEDBACK } from '#agent/agentFunctions';
import { buildFileSystemPrompt, buildFunctionCallHistoryPrompt, buildMemoryPrompt, updateFunctionSchemas } from '#agent/agentPromptUtils';
import { formatFunctionError, formatFunctionResult, notificationMessage, summariseLongFunctionOutput } from '#agent/agentRunner';
import { agentHumanInTheLoop, notifySupervisor } from '#agent/humanInTheLoop';
import { getServiceName } from '#fastify/trace-init/trace-init';
import { FunctionSchema, getAllFunctionSchemas } from '#functionSchema/functions';
import { FunctionResponse } from '#llm/llm';
import { logger } from '#o11y/logger';
import { withActiveSpan } from '#o11y/trace';
import { envVar } from '#utils/env-var';
import { appContext } from '../app';
import { AgentContext, agentContext, agentContextStorage, llms } from './agentContext';

export const XML_AGENT_SPAN = 'XmlAgent';

const stopSequences = ['</response>'];

const xmlSystemPrompt = readFileSync('src/agent/xml-agent-system-prompt').toString();

export async function runXmlAgent(agent: AgentContext): Promise<string> {
	const agentStateService = appContext().agentStateService;
	agent.state = 'agent';

	agentContextStorage.enterWith(agent);

	const agentLLM = llms().hard;

	const userRequestXml = `<user_request>${agent.userPrompt}</user_request>\n`;
	let currentPrompt = agent.inputPrompt;

	const agentFunctions = agent.functions;

	const functionsXml = convertJsonToXml(getAllFunctionSchemas(agentFunctions.getFunctionInstances()));
	const systemPromptWithFunctions = updateFunctionSchemas(xmlSystemPrompt, functionsXml);

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
	/** How many function calls have returned an error since the last human-in-the-loop check */
	let functionErrorCount = 0;

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
			shouldContinue = await withActiveSpan(XML_AGENT_SPAN, async (span) => {
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

					if (agent.error) {
						currentPrompt +=
							'\nThe last function call returned an error. Re-asses whether to 1) Retry a transient error. 2) Update the plan to work around it. 3) Request feedback if it doesnt seem fixable.';
					}

					let functionResponse: FunctionResponse;
					try {
						functionResponse = await agentLLM.generateFunctionResponse(currentPrompt, systemPromptWithFunctions, {
							id: 'generateFunctionCalls',
							stopSequences,
						});
					} catch (e) {
						// Should just catch parse error
						const retryPrompt = `${currentPrompt}\nNote: Your previous response did not contain the response in the required format of <response><function_calls>...</function_calls></response>. You must reply in the correct response format.`;
						functionResponse = await agentLLM.generateFunctionResponse(retryPrompt, systemPromptWithFunctions, {
							id: 'generateFunctionCalls-retryError',
							stopSequences,
						});
					}
					currentPrompt = buildFunctionCallHistoryPrompt() + buildMemoryPrompt() + buildFileSystemPrompt() + userRequestXml + functionResponse.textResponse;
					const functionCalls = functionResponse.functions.functionCalls;

					if (!functionCalls.length) {
						// Re-try once with an addition to the prompt that there was no function calls,
						// and it should call one of the Agent functions to finish if it's not sure what to do next.
						const retryPrompt = `${currentPrompt}
						Note: Your previous response did not contain a function call.  If you are able to answer/complete the question/task, then call the ${AGENT_COMPLETED_NAME} function with the appropriate response.
						If you are unsure what to do next then call the ${AGENT_REQUEST_FEEDBACK} function with a clarifying question.`;
						const functionCallResponse: FunctionResponse = await agentLLM.generateFunctionResponse(retryPrompt, systemPromptWithFunctions, {
							id: 'generateFunctionCalls-retryNoFunctions',
							stopSequences,
						});
						// retrying
						currentPrompt =
							buildFunctionCallHistoryPrompt() + buildMemoryPrompt() + buildFileSystemPrompt() + userRequestXml + functionCallResponse.textResponse;
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
							const functionResponse: any = await agentFunctions.callFunction(functionCall);
							const functionResult = formatFunctionResult(functionCall.function_name, functionResponse);
							// if (functionResult.startsWith('<response>')) functionResult = functionResult.slice(10); // do we need this here? seem more for the agent control loop response
							// The trailing </response> will be removed as it's a stop word for the LLMs
							functionResults.push(formatFunctionResult(functionCall.function_name, functionResponse));
							const functionResponseString = JSON.stringify(functionResponse ?? '');

							// To minimise the function call history size becoming too large (i.e. expensive & slow) we'll create a summary for responses which are quite long
							const outputSummary: string | null = await summariseLongFunctionOutput(functionCall, functionResponse);

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
							agent.error = null;
						} catch (e) {
							functionErrorCount++;
							anyFunctionCallErrors = true;
							agent.state = 'error';
							logger.error(e, 'Function error');
							agent.error = e.toString();
							await agentStateService.save(agent);
							functionResults.push(formatFunctionError(functionCall.function_name, e));
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
					currentPrompt = `${userRequestXml}\n${functionResponse.textResponse}\n${functionResults.join('\n')}`;
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
 * Converts the JSON function schemas to the XML format described in the xml-agent-system-prompt
 * @param jsonDefinitions The JSON object containing function schemas
 * @returns A string containing the XML representation of the function schemas
 */
function convertJsonToXml(jsonDefinitions: FunctionSchema[]): string {
	let xmlOutput = '<functions>\n';

	for (const funcDef of jsonDefinitions) {
		xmlOutput += '  <function_description>\n';
		xmlOutput += `    <function_name>${funcDef.name}</function_name>\n`;
		xmlOutput += `    <description>${funcDef.description}</description>\n`;

		if (funcDef.parameters.length > 0) {
			xmlOutput += '    <parameters>\n';
			for (const param of funcDef.parameters) {
				xmlOutput += `    <${param.name} type="${param.type}" ${param.optional ? 'optional' : ''}>${param.description}</${param.name}>\n`;
				// xmlOutput += '      <parameter>\n';
				// xmlOutput += `        <name>${param.name}</name>\n`;
				// xmlOutput += `        <type>${param.type}</type>\n`;
				// if (param.optional) {
				// 	xmlOutput += '        <optional>true</optional>\n';
				// }
				// xmlOutput += `        <description>${param.description}</description>\n`;
				// xmlOutput += '      </parameter>\n';
			}
			xmlOutput += '    </parameters>\n';
		}

		if (funcDef.returns) {
			xmlOutput += `    <returns>${funcDef.returns}</returns>\n`;
		}

		xmlOutput += '  </function_description>\n';
	}

	xmlOutput += '</functions>';
	return xmlOutput;
}
