import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';
import { Toolbox } from '#agent/toolbox';
import { Invoke, Invoked, LLM, TaskLevel } from '#llm/llm';
import { deserializeLLMs } from '#llm/llmFactory';
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
	/** Empty string in single-user mode */
	userId: string;
	userEmail?: string;
	state: AgentRunningState;
	inputPrompt: string;
	systemPrompt: string;
	planningResponse?: string;
	executionId: string;
	parentExecutionId?: string;
	isRetry: boolean;
	functionCallHistory: Invoked[];

	cost: number;
	budget: number;
	budgetRemaining: number;

	llms: AgentLLMs;
	cacheService: FunctionCacheService;
	/** Working filesystem */
	fileSystem?: FileSystem | null;
	/** Directory for cloning repositories etc */
	tempDir: string;
	toolbox: Toolbox;
	memory: Map<string, string>;

	scm: SourceControlManagement | null;
}

export const agentContext = new AsyncLocalStorage<AgentContext>();

export function llms(): AgentLLMs {
	return agentContext.getStore().llms;
}

/**
 * Adds LLM costs to the agent context
 * @param cost the cost spent in $USD
 */
export function addCost(cost: number) {
	const store = agentContext.getStore();
	console.log(`Adding cost $${cost}`);
	store.cost += cost;
	store.budgetRemaining -= cost;
	if (store.budgetRemaining < 0) store.budgetRemaining = 0;
}

export function getFileSystem(): FileSystem {
	const filesystem = agentContext.getStore().fileSystem;
	if (!filesystem) throw new Error('No file system available in the workflow context');
	return filesystem;
}

export function runWithContext(config: { llms: AgentLLMs; retryExecutionId?: string }, func: () => any) {
	const store: AgentContext = createContext(config.llms, config.retryExecutionId);
	agentContext.run(store, func);
}

/**
 * Sets the AsyncLocalStorage agent context for the remainder of the current synchronous execution and then persists it through any following asynchronous calls.
 * @param llms
 * @param retryExecutionId
 */
export function enterWithContext(llms: AgentLLMs, retryExecutionId?: string) {
	const context: AgentContext = createContext(llms, retryExecutionId);
	agentContext.enterWith(context);
	context.toolbox.addTool(context.fileSystem, 'FileSystem');
}

export function createContext(llms: AgentLLMs, retryExecutionId?: string): AgentContext {
	return {
		userId: '',
		systemPrompt: '',
		inputPrompt: '',
		state: 'agent',
		functionCallHistory: [],
		userEmail: process.env.USER_EMAIL,
		executionId: retryExecutionId || randomUUID(),
		isRetry: !!retryExecutionId,
		cacheService: new FileCacheService('./.cache/tools'),
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
	const store = agentContext.getStore();
	Object.assign(store, updates);
}

export function serializeContext(context: AgentContext): string {
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
				easy: context.llms.easy.toJSON(),
				medium: context.llms.medium.toJSON(),
				hard: context.llms.hard.toJSON(),
				xhard: context.llms.xhard.toJSON(),
			};
		}
		// otherwise throw error
		else {
			throw new Error(`Cant serialize context property ${key}`);
		}
	}
	return JSON.stringify(serialized);
}

export function deserializeContext(json: string): AgentContext {
	const serialised = JSON.parse(json);
	const context: Partial<AgentContext> = {};

	for (const key of Object.keys(serialised)) {
		// copy Array and primitive properties across
		if (Array.isArray(serialised[key]) || typeof serialised[key] === 'string' || typeof serialised[key] === 'number' || typeof serialised[key] === 'boolean') {
			context[key] = serialised[key];
		}
	}
	context.cacheService = new FileCacheService('').fromJSON(serialised.cacheService);
	context.fileSystem = new FileSystem().fromJSON(serialised.fileSystem);
	context.toolbox = new Toolbox().fromJSON(serialised.toolbox);
	context.memory = new Map(JSON.parse(serialised.memory));
	console.log('TODO deserialize context.scm'); // TODO deserialize context.scm
	context.scm = serialised.scm ? new GitLabServer() : null;
	context.llms = deserializeLLMs(serialised.llms);
	return context as AgentContext;
}
