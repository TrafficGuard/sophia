import { LlmFunctions } from '#agent/LlmFunctions';
import { AgentContext, AgentLLMs, createContext, llms } from '#agent/agentContext';
import { AGENT_REQUEST_FEEDBACK } from '#agent/agentFunctions';
import { runPythonAgent } from '#agent/pythonAgentRunner';
import { runXmlAgent } from '#agent/xmlAgentRunner';
import { FunctionCall, FunctionCallResult } from '#llm/llm';
import { logger } from '#o11y/logger';
import { User } from '#user/user';
import { CDATA_END, CDATA_START } from '#utils/xml-utils';
import { appContext } from '../app';

export const SUPERVISOR_RESUMED_FUNCTION_NAME = 'Supervisor.Resumed';
export const SUPERVISOR_CANCELLED_FUNCTION_NAME = 'Supervisor.Cancelled';
const FUNCTION_OUTPUT_SUMMARIZE_MIN_LENGTH = 2000;

/**
 * Configuration for running an autonomous agent
 */
export interface RunAgentConfig {
	/** Uses currentUser() if not provided */
	user?: User;
	/** The name of this agent */
	agentName: string;
	/** The type of autonomous agent function calling. Defaults to XML */
	type?: 'xml' | 'python';
	/** The functions the agent has available to call */
	functions: LlmFunctions | Array<new () => any>;
	/** The initial prompt */
	initialPrompt: string;
	/** The agent system prompt */
	systemPrompt?: string;
	/** Settings for requiring a human in the loop */
	humanInLoop?: { budget?: number; count?: number; functionErrorCount?: number };
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

async function runAgent(agent: AgentContext): Promise<string> {
	switch (agent.type) {
		case 'xml':
			return runXmlAgent(agent);
		case 'python':
			return runPythonAgent(agent);
		default:
			throw new Error(`Invalid agent type ${agent.type}`);
	}
}

export async function startAgent(config: RunAgentConfig): Promise<string> {
	const agent: AgentContext = createContext(config);

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

	return runAgent(agent);
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
	if (agent.executionId !== executionId) throw new Error('Invalid executionId. Agent has already been resumed');

	agent.functionCallHistory.push({
		function_name: SUPERVISOR_RESUMED_FUNCTION_NAME,
		stdout: feedback,
		parameters: {},
	});
	agent.error = undefined;
	agent.state = 'agent';
	agent.inputPrompt += `\nSupervisor note: ${feedback}`;
	await appContext().agentStateService.save(agent);
	await runAgent(agent);
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
	await runAgent(agent);
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
	await runAgent(agent);
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
	await runAgent(agent);
}

export async function summariseLongFunctionOutput(functionCall: FunctionCall, result: string): Promise<string | null> {
	if (!result || result.length < FUNCTION_OUTPUT_SUMMARIZE_MIN_LENGTH) return null;

	const prompt = `<function_name>${functionCall.function_name}</function_name>\n<output>\n${result}\n</output>\n
	For the above function call summarise the output into a paragraph that captures key details about the output content, which might include identifiers, content summary, content structure and examples. Only responsd with the summary`;
	return await llms().easy.generateText(prompt, null, { id: 'summariseLongFunctionOutput' });
}

export function notificationMessage(agent: AgentContext): string {
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

/**
 * Formats the output of a successful function call
 * @param functionName
 * @param result
 */
export function formatFunctionResult(functionName: string, result: any): string {
	return `<function_results>
        <result>
        <function_name>${functionName}</function_name>
        <stdout>${CDATA_START}
        ${JSON.stringify(result)}
        ${CDATA_END}</stdout>
        </result>
        </function_results>
        `;
}

/**
 * Formats the output of a failed function call
 * @param functionName
 * @param error
 */
export function formatFunctionError(functionName: string, error: any): string {
	return `<function_results>
		<function_name>${functionName}</function_name>
        <error>${CDATA_START}
        ${JSON.stringify(error)}
        ${CDATA_END}</error>
        </function_results>`;
}
