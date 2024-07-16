import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';
import { LlmFunctions } from '#agent/LlmFunctions';
import { RunAgentConfig } from '#agent/agentRunner';
import { FileSystem } from '#functions/filesystem';
import { FunctionCall, FunctionCallResult, LLM } from '#llm/llm';
import { deserializeLLMs } from '#llm/llmFactory';
import { logger } from '#o11y/logger';
import { User } from '#user/user';
import { currentUser } from '#user/userService/userContext';
import { appContext } from '../app';

/**
 * The difficulty of a LLM generative task. Used to select an appropriate model for the cost vs capability.
 */
export type TaskLevel = 'easy' | 'medium' | 'hard' | 'xhard';

/**
 * The LLMs for each Task Level
 */
export type AgentLLMs = Record<TaskLevel, LLM>;

/**
 * agent - waiting for the agent control loop to plan
 * functions - waiting for the function call(s) to complete
 * error - the agent control loop has errored
 * hil - the agent is waiting human confirmation to continue
 * feedback - the agent is waiting human feedback for a decision
 * completed - the agent has finished
 */
export type AgentRunningState = 'agent' | 'functions' | 'error' | 'hil' | 'feedback' | 'completed';

/**
 * The state of an agent.
 */
export interface AgentContext {
	/** Primary Key - Agent instance id. Allocated when the agent is first starts */
	agentId: string;
	/** Id of the running execution. This changes after the agent restarts due to an error, pausing, human in loop,  etc */
	executionId: string;
	/** Current OpenTelemetry traceId */
	traceId: string;
	/** Display name */
	name: string;
	/** Not used yet */
	parentAgentId?: string;
	/** The user who created the agent */
	user: User;
	/** The current state of the agent */
	state: AgentRunningState;
	/** Tracks what functions/spans we've called into */
	callStack: string[];
	/** Error message & stack */
	error?: string;
	/** Budget spend in $USD until a human-in-the-loop is required */
	hilBudget;
	/** Total cost of running this agent */
	cost: number;
	/** Budget remaining until human intervention is required */
	budgetRemaining: number;
	/** Pre-configured LLMs by task difficulty level for the agent. Specific LLMs can always be instantiated if required. */
	llms: AgentLLMs;
	/** Working filesystem */
	fileSystem?: FileSystem | null;
	/** Memory persisted over the agent's executions */
	memory: Record<string, string>;
	/** Time of the last database write of the state */
	lastUpdate: number;

	// Autonomous agent specific properties --------------------

	/** The type of autonomous agent function calling.*/
	type: 'xml' | 'python';
	/** The function calls the agent is about to call */
	invoking: FunctionCall[];
	/** The initial user prompt */
	userPrompt: string;
	/** The prompt the agent execution started/resumed with */
	inputPrompt: string;
	/** Completed function calls with success/error output */
	functionCallHistory: FunctionCallResult[];
	/** How many iterations of the autonomous agent control loop to require human input to continue */
	hilCount;
	/** The functions available to the agent */
	functions: LlmFunctions;
}

export const agentContextStorage = new AsyncLocalStorage<AgentContext>();

export function agentContext(): AgentContext | undefined {
	return agentContextStorage.getStore();
}

export function llms(): AgentLLMs {
	return agentContextStorage.getStore().llms;
}

/**
 * Adds costs to the current agent context (from LLM calls, Perplexity etc)
 * @param cost the cost spent in $USD
 */
export function addCost(cost: number) {
	const store = agentContextStorage.getStore();
	if (!store) return;
	logger.debug(`Adding cost $${cost}`);
	store.cost += cost;
	store.budgetRemaining -= cost;
	if (store.budgetRemaining < 0) store.budgetRemaining = 0;
}

/**
 * @return the filesystem on the current agent context
 */
export function getFileSystem(): FileSystem {
	if (!agentContextStorage.getStore() && process.env.TEST === 'true') return new FileSystem();
	const filesystem = agentContextStorage.getStore()?.fileSystem;
	if (!filesystem) throw new Error('No file system available on the agent context');
	return filesystem;
}

export function createContext(config: RunAgentConfig): AgentContext {
	const fileSystem = new FileSystem(config.fileSystemPath);
	// TODO create a test for this that the context.filesystem is the same reference as the context.functions["FileSystem"]}
	// Make sure we have the same FileSystem object on the context and in the functions
	const functions: LlmFunctions = Array.isArray(config.functions) ? new LlmFunctions(...config.functions) : config.functions;
	if (functions.getFunctionClassNames().includes(FileSystem.name)) {
		functions.removeFunctionClass(FileSystem.name);
		functions.addFunctionInstance(fileSystem, FileSystem.name);
	}
	return {
		agentId: config.resumeAgentId || randomUUID(),
		executionId: randomUUID(),
		traceId: '',
		name: config.agentName,
		type: config.type ?? 'xml',
		user: config.user ?? currentUser(),
		inputPrompt: '',
		userPrompt: config.initialPrompt,
		state: 'agent',
		functionCallHistory: [],
		callStack: [],
		hilBudget: config.humanInLoop?.budget ?? (process.env.HIL_BUDGET ? parseFloat(process.env.HIL_BUDGET) : 2),
		hilCount: config.humanInLoop?.count ?? (process.env.HIL_COUNT ? parseFloat(process.env.HIL_COUNT) : 5),
		budgetRemaining: 0,
		cost: 0,
		llms: config.llms,
		fileSystem,
		functions: Array.isArray(config.functions) ? new LlmFunctions(...config.functions) : config.functions,
		memory: {},
		invoking: [],
		lastUpdate: Date.now(),
	};
}

export function serializeContext(context: AgentContext): Record<string, any> {
	const serialized = {};

	for (const key of Object.keys(context)) {
		if (context[key] === undefined) {
			// do nothing
		} else if (context[key] === null) {
			serialized[key] = null;
		}
		// Copy primitive properties across
		else if (typeof context[key] === 'string' || typeof context[key] === 'number' || typeof context[key] === 'boolean') {
			serialized[key] = context[key];
		}
		// Assume arrays (functionCallHistory) can be directly de(serialised) to JSON
		else if (Array.isArray(context[key])) {
			serialized[key] = context[key];
		}
		// Object type check for a toJSON function
		else if (typeof context[key] === 'object' && context[key].toJSON) {
			serialized[key] = context[key].toJSON();
		}
		// Handle Maps (must only contain primitive/simple object values)
		else if (key === 'memory') {
			serialized[key] = context[key];
		} else if (key === 'llms') {
			serialized[key] = {
				easy: context.llms.easy?.getId(),
				medium: context.llms.medium?.getId(),
				hard: context.llms.hard?.getId(),
				xhard: context.llms.xhard?.getId(),
			};
		} else if (key === 'user') {
			serialized[key] = context.user.id;
		}
		// otherwise throw error
		else {
			throw new Error(`Cant serialize context property ${key}`);
		}
	}
	return serialized;
}

export async function deserializeAgentContext(serialized: Record<string, any>): Promise<AgentContext> {
	const context: Partial<AgentContext> = {};

	for (const key of Object.keys(serialized)) {
		// copy Array and primitive properties across
		if (Array.isArray(serialized[key]) || typeof serialized[key] === 'string' || typeof serialized[key] === 'number' || typeof serialized[key] === 'boolean') {
			context[key] = serialized[key];
		}
	}

	context.fileSystem = new FileSystem().fromJSON(serialized.fileSystem);
	context.functions = new LlmFunctions().fromJSON(serialized.functions ?? serialized.toolbox); // toolbox for backward compat
	context.memory = serialized.memory;
	context.llms = deserializeLLMs(serialized.llms);

	const user = currentUser();
	if (serialized.user === user.id) context.user = user;
	else context.user = await appContext().userService.getUser(serialized.user);

	// backwards compatability
	if (!context.type) context.type = 'xml';

	return context as AgentContext;
}
