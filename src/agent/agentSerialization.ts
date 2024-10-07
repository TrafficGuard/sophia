import { LlmFunctions } from '#agent/LlmFunctions';
import { AgentContext } from '#agent/agentContextTypes';
import { getCompletedHandler } from '#agent/completionHandlerRegistry';
import { FileSystemService } from '#functions/storage/fileSystemService';
import { deserializeLLMs } from '#llm/llmFactory';
import { currentUser } from '#user/userService/userContext';
import { appContext } from '../app';

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

	context.fileSystem = new FileSystemService().fromJSON(serialized.fileSystem);
	context.functions = new LlmFunctions().fromJSON(serialized.functions ?? (serialized as any).toolbox); // toolbox for backward compat

	context.memory = serialized.memory;
	context.metadata = serialized.metadata;
	context.llms = deserializeLLMs(serialized.llms);

	const user = currentUser();
	if (serialized.user === user.id) context.user = user;
	else context.user = await appContext().userService.getUser(serialized.user);

	context.completedHandler = getCompletedHandler(serialized.completedHandler);

	// backwards compatability
	if (!context.type) context.type = 'xml';
	if ((context.type as string) === 'python') context.type = 'codegen';
	if (!context.iterations) context.iterations = 0;

	// Need to default empty parameters. Seems to get lost in Firestore
	for (const call of context.functionCallHistory) call.parameters ??= {};

	return context as AgentContext;
}
