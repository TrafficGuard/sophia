import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';
import { LlmFunctions } from '#agent/LlmFunctions';
import { RunAgentConfig } from '#agent/agentRunner';
import { FileSystem } from '#functions/filesystem';
import { FunctionCall, FunctionCallResult, LLM, TaskLevel } from '#llm/llm';
import { deserializeLLMs } from '#llm/llmFactory';
import { logger } from '#o11y/logger';
import { User } from '#user/user';
import { currentUser } from '#user/userService/userContext';
import { appContext } from '../app';

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

export interface AgentContext {
	/** Primary Key - Agent instance id. Allocated when the agent is first starts */
	agentId: string;
	/** Id of the running execution. This changes after the control loop restarts after an exit due to pausing, human in loop etc */
	executionId: string;
	/** Current OpenTelemetry traceId */
	traceId: string;
	/** User provided name */
	name: string;
	parentAgentId?: string;
	/** The type of autonomous agent function calling.*/
	type: 'xml' | 'python';

	user: User;

	state: AgentRunningState;
	/** The initial user prompt */
	userPrompt: string;
	/** The prompt the agent execution started with */
	inputPrompt: string;

	systemPrompt: string;
	/* Track what functions we've called into */
	callStack: string[];
	functionCallHistory: FunctionCallResult[];

	// These three fields are mutable for when saving state as the agent does work
	error?: string;
	planningResponse?: string;
	invoking: FunctionCall[];

	hilBudget;
	hilCount;
	/** Total cost of running this agent */
	cost: number;
	/** Budget allocated until human intervention is required. This may be increased when the agent is running */
	budget: number;
	/** Budget remaining until human intervention is required */
	budgetRemaining: number;

	llms: AgentLLMs;
	/** Working filesystem */
	fileSystem?: FileSystem | null;
	/** The functions available to the agent */
	functions: LlmFunctions;
	/** Memory persisted over the agent's control loop iterations */
	memory: Record<string, string>;

	lastUpdate: number;
}

export const agentContextStorage = new AsyncLocalStorage<AgentContext>();

export function agentContext(): AgentContext | undefined {
	return agentContextStorage.getStore();
}

export function llms(): AgentLLMs {
	return agentContextStorage.getStore().llms;
}

/**
 * Adds LLM costs to the agent context
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

export function getFileSystem(): FileSystem {
	if (!agentContextStorage.getStore() && process.env.TEST === 'true') return new FileSystem();
	const filesystem = agentContextStorage.getStore()?.fileSystem;
	if (!filesystem) throw new Error('No file system available on the agent context');
	return filesystem;
}

export function createContext(config: RunAgentConfig): AgentContext {
	return {
		agentId: config.resumeAgentId || randomUUID(),
		executionId: randomUUID(),
		traceId: '',
		name: config.agentName,
		type: config.type ?? 'xml',
		user: config.user ?? currentUser(),
		systemPrompt: config.systemPrompt,
		inputPrompt: '',
		userPrompt: config.initialPrompt,
		state: 'agent',
		functionCallHistory: [],
		callStack: [],
		hilBudget: config.humanInLoop?.budget ?? (process.env.HIL_BUDGET ? parseFloat(process.env.HIL_BUDGET) : 2),
		hilCount: config.humanInLoop?.count ?? (process.env.HIL_COUNT ? parseFloat(process.env.HIL_COUNT) : 5),
		budget: 0,
		budgetRemaining: 0,
		cost: 0,
		llms: config.llms,
		fileSystem: new FileSystem(config.fileSystemPath),
		functions: Array.isArray(config.functions) ? new LlmFunctions(...config.functions) : config.functions, // TODO Should replace FileSystem with the context filesystem
		memory: {},
		invoking: [],
		lastUpdate: Date.now(),
	};
}

export function updateContext(updates: Partial<AgentContext>) {
	const store = agentContextStorage.getStore();
	Object.assign(store, updates);
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
