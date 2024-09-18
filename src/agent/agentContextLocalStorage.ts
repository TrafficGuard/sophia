import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';
import { LlmFunctions } from '#agent/LlmFunctions';
import { ConsoleCompletedHandler } from '#agent/agentCompletion';
import { AgentContext, AgentLLMs } from '#agent/agentContextTypes';
import { RunAgentConfig } from '#agent/agentRunner';
import { getCompletedHandler } from '#agent/completionHandlerRegistry';
import { FileSystem } from '#functions/storage/filesystem';
import { deserializeLLMs } from '#llm/llmFactory';
import { logger } from '#o11y/logger';
import { currentUser } from '#user/userService/userContext';
import { appContext } from '../app';

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
}

/**
 * Adds a note for the agent, which will be included in the prompt for the agent after the tool results
 * @param note
 */
export function addNote(note: string): void {
	agentContext()?.notes.push(note);
}

/**
 * @return the filesystem on the current agent context
 */
export function getFileSystem(): FileSystem {
	if (!agentContextStorage.getStore()) return new FileSystem();
	const filesystem = agentContextStorage.getStore()?.fileSystem;
	if (!filesystem) throw new Error('No file system available on the agent context');
	return filesystem;
}

/**
 * After we have added functions or deserialized an agent, we need to make sure that if the
 * agent has the FileSystem function available that it's the same object as the FileSystem on the agent context
 * @param agent
 */
function resetFileSystemFunction(agent: AgentContext) {
	// Make sure we have the same FileSystem object on the context and in the functions
	const functions: LlmFunctions = Array.isArray(agent.functions) ? new LlmFunctions(...agent.functions) : agent.functions;
	if (functions.getFunctionClassNames().includes(FileSystem.name)) {
		functions.removeFunctionClass(FileSystem.name);
		functions.addFunctionInstance(agent.fileSystem, FileSystem.name);
	}
	agent.functions = functions;
}

export function createContext(config: RunAgentConfig): AgentContext {
	const fileSystem = new FileSystem(config.fileSystemPath);
	const hilBudget = config.humanInLoop?.budget ?? (process.env.HIL_BUDGET ? parseFloat(process.env.HIL_BUDGET) : 2);
	const context: AgentContext = {
		agentId: config.resumeAgentId || randomUUID(),
		executionId: randomUUID(),
		traceId: '',
		metadata: config.metadata ?? {},
		name: config.agentName,
		type: config.type ?? 'python',
		user: config.user ?? currentUser(),
		inputPrompt: '',
		userPrompt: config.initialPrompt,
		state: 'agent',
		iterations: 0,
		functionCallHistory: [],
		messages: [],
		pendingMessages: [],
		callStack: [],
		notes: [],
		hilBudget,
		hilCount: config.humanInLoop?.count ?? (process.env.HIL_COUNT ? parseFloat(process.env.HIL_COUNT) : 5),
		budgetRemaining: hilBudget,
		cost: 0,
		llms: config.llms,
		fileSystem,
		functions: Array.isArray(config.functions) ? new LlmFunctions(...config.functions) : config.functions,
		completedHandler: config.completedHandler ?? new ConsoleCompletedHandler(),
		memory: {},
		invoking: [],
		lastUpdate: Date.now(),
	};
	resetFileSystemFunction(context);
	return context;
}

export function serializeContext(context: AgentContext): Record<string, any> {
	const serialized = {};

	for (const key of Object.keys(context) as Array<keyof AgentContext>) {
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
		else if (key === 'memory' || key === 'metadata') {
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
		} else if (key === 'completedHandler') {
			context.completedHandler.agentCompletedHandlerId();
		}
		// otherwise throw error
		else {
			throw new Error(`Cant serialize context property ${key}`);
		}
	}
	return serialized;
}

export async function deserializeAgentContext(serialized: Record<keyof AgentContext, any>): Promise<AgentContext> {
	const context: Partial<AgentContext> = {};

	for (const key of Object.keys(serialized)) {
		// copy Array and primitive properties across
		if (Array.isArray(serialized[key]) || typeof serialized[key] === 'string' || typeof serialized[key] === 'number' || typeof serialized[key] === 'boolean') {
			context[key] = serialized[key];
		}
	}

	context.fileSystem = new FileSystem().fromJSON(serialized.fileSystem);
	context.functions = new LlmFunctions().fromJSON(serialized.functions ?? (serialized as any).toolbox); // toolbox for backward compat

	resetFileSystemFunction(context as AgentContext); // TODO add a test for this

	context.memory = serialized.memory;
	context.metadata = serialized.metadata;
	context.llms = deserializeLLMs(serialized.llms);

	const user = currentUser();
	if (serialized.user === user.id) context.user = user;
	else context.user = await appContext().userService.getUser(serialized.user);

	context.completedHandler = getCompletedHandler(serialized.completedHandler);

	// backwards compatability
	if (!context.type) context.type = 'xml';
	if (!context.iterations) context.iterations = 0;

	// Need to default empty parameters. Seems to get lost in Firestore
	for (const call of context.functionCallHistory) call.parameters ??= {};

	return context as AgentContext;
}
