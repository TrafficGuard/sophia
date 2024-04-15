import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';
import { Toolbox } from '#agent/toolbox';
import { Invoke, LLM, TaskLevel } from '#llm/llm';
import { FunctionCacheService } from '../cache/cache';
import { FileCacheService } from '../cache/fileCacheService';
import { SourceControlManagement } from '../functions/scm/sourceControlManagement';
import { FileSystem } from './filesystem';

/**
 * The LLMs for each Task Level
 */
export type AgentLLMs = Record<TaskLevel, LLM>;

export interface AgentContext {
	/** Empty string in single-user mode */
	userId: string;
	userEmail?: string;
	inputPrompt: string;
	systemPrompt: string;
	executionId: string;
	parentExecutionId?: string;
	isRetry: boolean;
	functionCallHistory: Invoke[];

	cost: number;
	budget: number;
	budgetRemaining: number;

	llms: Record<TaskLevel, LLM>;
	cacheService: FunctionCacheService;
	/** Working filesystem */
	fileSystem?: FileSystem | null;
	/** Directory for cloning repositories etc */
	tempDir: string;
	toolbox: Toolbox;

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

export function runWithContext(context: { llms: AgentLLMs; retryExecutionId?: string }, func: () => any) {
	const isRetry = !!context.retryExecutionId;
	const store: AgentContext = {
		userId: '',
		systemPrompt: '',
		inputPrompt: '',
		functionCallHistory: [],
		userEmail: process.env.USER_EMAIL,
		executionId: context.retryExecutionId || randomUUID(),
		isRetry,
		cacheService: new FileCacheService('./.cache/tools'),
		budget: 0,
		budgetRemaining: 0,
		cost: 0,
		llms: context.llms,
		scm: null,
		tempDir: './temp',
		fileSystem: new FileSystem(),
		toolbox: new Toolbox(),
	};
	agentContext.run(store, func);
}

/**
 * Sets the AsyncLocalStorage agent context for the remainder of the current synchronous execution and then persists it through any following asynchronous calls.
 * @param llms
 * @param retryExecutionId
 */
export function enterWithContext(llms: AgentLLMs, retryExecutionId?: string) {
	const isRetry = !!retryExecutionId;
	agentContext.enterWith({
		userId: '',
		inputPrompt: '',
		functionCallHistory: [],
		systemPrompt: '',
		executionId: retryExecutionId || randomUUID(),
		isRetry,
		cacheService: new FileCacheService('./.cache/tools'),
		budget: 0,
		budgetRemaining: 0,
		cost: 0,
		llms,
		scm: null,
		tempDir: './temp',
		fileSystem: new FileSystem(),
		toolbox: new Toolbox(),
	});
}

export function updateContext(updates: Partial<AgentContext>) {
	const store = agentContext.getStore();
	Object.assign(store, updates);
}
