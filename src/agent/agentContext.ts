import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';
import { Toolbox } from '#agent/toolbox';
import { Invoke, Invoked, LLM, TaskLevel } from '#llm/llm';
import { deserializeLLMs } from '#llm/llmFactory';
import { logger } from '#o11y/logger';
import { FunctionCacheService } from '../cache/cache';
import { FileCacheService } from '../cache/fileCacheService';
import { GitLabServer } from '../functions/scm/gitlab';
import { SourceControlManagement } from '../functions/scm/sourceControlManagement';
import { FileSystem } from './filesystem';

/**
 * The LLMs for each Task Level
 */
export type AgentLLMs = Record<TaskLevel, LLM>;

/**
 * agent - waiting for the agent control loop to plan
 * functions - waiting for the function calls to complete
 * error - the agent control loop has errored
 * hil - the agent is waiting human confirmation to continue
 * feedback - the agent is waiting human feedback for a decision
 * completed - the agent has completed
 */
export type AgentRunningState = 'agent' | 'functions' | 'error' | 'hil' | 'feedback' | 'completed';

export interface AgentContext {
	/** Agent instance id - allocated when the agent is first starts */
	agentId: string;
	/** Id of the running execution. This changes after the control loop restarts after an exit due to pausing, human in loop etc */
	executionId: string;
	name: string;
	parentAgentId?: string;
	isRetry: boolean;
	/** Empty string in single-user mode */
	userId: string;
	userEmail?: string;

	state: AgentRunningState;
	inputPrompt: string;
	systemPrompt: string;
	/* Track what f3232unctions we've called into */
	callStack: string[];
	functionCallHistory: Invoked[];

	// These three fields are mutable for when saving state as the agent does work
	error?: string;
	planningResponse?: string;
	invoking: Invoke[];
	/** Total cost of running this agent */
	cost: number;
	/** Budget allocated until human intervention is required. This may be increased when the agent is running */
	budget: number;
	/** Budget remaining until human intervention is required */
	budgetRemaining: number;

	llms: AgentLLMs;
	functionCacheService: FunctionCacheService;
	/** Working filesystem */
	fileSystem?: FileSystem | null;
	/** Directory for cloning repositories etc */
	tempDir: string;
	/** The tools/functions available to the agent */
	toolbox: Toolbox;
	/** Memory persisted over the agent's control loop iterations */
	memory: Map<string, string>;
	/** GitLab/GitHub/BitBucket when the working directory is a Git repo */
	scm: SourceControlManagement | null;
}

export const agentContextStorage = new AsyncLocalStorage<AgentContext>();

export function agentContext(): AgentContext {
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
	logger.info(`Adding cost $${cost}`);
	store.cost += cost;
	store.budgetRemaining -= cost;
	if (store.budgetRemaining < 0) store.budgetRemaining = 0;
}

export function getFileSystem(): FileSystem {
	const filesystem = agentContextStorage.getStore().fileSystem;
	if (!filesystem) throw new Error('No file system available in the workflow context');
	return filesystem;
}

export function runWithContext(config: { name: string; llms: AgentLLMs; retryExecutionId?: string }, func: () => any) {
	const store: AgentContext = createContext(config.name, config.llms, config.retryExecutionId);
	agentContextStorage.run(store, func);
}

/**
 * Sets the AsyncLocalStorage agent context for the remainder of the current synchronous execution and then persists it through any following asynchronous calls.
 * @param llms
 * @param retryExecutionId
 */
export function enterWithContext(name: string, llms: AgentLLMs, retryExecutionId?: string) {
	const context: AgentContext = createContext(name, llms, retryExecutionId);
	agentContextStorage.enterWith(context);
	context.toolbox.addTool(context.fileSystem, 'FileSystem');
}

export function createContext(name: string, llms: AgentLLMs, resumeAgentId?: string): AgentContext {
	return {
		agentId: resumeAgentId || randomUUID(),
		executionId: randomUUID(),
		name,
		userId: '',
		systemPrompt: '',
		inputPrompt: '',
		state: 'agent',
		callStack: [],
		functionCallHistory: [],
		invoking: [],
		userEmail: process.env.USER_EMAIL,
		isRetry: !!resumeAgentId,
		functionCacheService: new FileCacheService('./.cache/tools'),
		budget: 0,
		budgetRemaining: 0,
		cost: 0,
		llms: llms,
		scm: null,
		tempDir: './temp',
		fileSystem: new FileSystem(),
		toolbox: new Toolbox(),
		memory: new Map(),
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
			serialized[key] = JSON.stringify(Array.from(context[key].entries()));
		} else if (key === 'llms') {
			serialized[key] = {
				easy: context.llms.easy?.toJSON(),
				medium: context.llms.medium?.toJSON(),
				hard: context.llms.hard?.toJSON(),
				xhard: context.llms.xhard?.toJSON(),
			};
		}
		// otherwise throw error
		else {
			throw new Error(`Cant serialize context property ${key}`);
		}
	}
	return serialized;
}

export function deserializeContext(serialised: Record<string, any>): AgentContext {
	const context: Partial<AgentContext> = {};

	for (const key of Object.keys(serialised)) {
		// copy Array and primitive properties across
		if (Array.isArray(serialised[key]) || typeof serialised[key] === 'string' || typeof serialised[key] === 'number' || typeof serialised[key] === 'boolean') {
			context[key] = serialised[key];
		}
	}

	context.functionCacheService = new FileCacheService('').fromJSON(serialised.functionCacheService);
	context.fileSystem = new FileSystem().fromJSON(serialised.fileSystem);
	context.toolbox = new Toolbox().fromJSON(serialised.toolbox);
	context.memory = new Map(JSON.parse(serialised.memory));
	console.log('TODO deserialize context.scm'); // TODO deserialize context.scm
	context.scm = serialised.scm ? new GitLabServer() : null;
	context.llms = deserializeLLMs(serialised.llms);
	return context as AgentContext;
}
