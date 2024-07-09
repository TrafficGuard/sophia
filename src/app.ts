import { AgentStateService } from '#agent/agentStateService/agentStateService';
import { FileAgentStateService } from '#agent/agentStateService/fileAgentStateService';
import { FirestoreAgentStateService } from '#agent/agentStateService/firestoreAgentStateService';
import { InMemoryAgentStateService } from '#agent/agentStateService/inMemoryAgentStateService';
import { RouteDefinition } from '#fastify/fastifyApp';
import { FirestoreLlmCallService } from '#llm/llmCallService/firestoreLlmCallService';
import { InMemoryLlmCallService } from '#llm/llmCallService/inMemoryLlmCallService';
import { LlmCallService } from '#llm/llmCallService/llmCallService';
import { logger } from '#o11y/logger';
import { FileUserService } from '#user/userService/fileUserService';
import { FirestoreUserService } from '#user/userService/firestoreUserService';
import { InMemoryUserService } from '#user/userService/inMemoryUserService';
import { UserService } from '#user/userService/userService';
import { FileFunctionCacheService } from './cache/fileFunctionCacheService';
import { FirestoreCacheService } from './cache/firestoreFunctionCacheService';
import { FunctionCacheService } from './cache/functionCacheService';
import { TypeBoxFastifyInstance, initFastify } from './fastify';
import { functionRegistry } from './functionRegistry';
import { agentDetailsRoutes } from './routes/agent/agent-details-routes';
import { agentExecutionRoutes } from './routes/agent/agent-execution-routes';
import { agentStartRoute } from './routes/agent/agent-start-route';
import { gitlabRoutesV1 } from './routes/gitlab/gitlabRoutes-v1';
import { llmCallRoutes } from './routes/llms/llm-call-routes';
import { llmRoutes } from './routes/llms/llm-routes';
import { profileRoute } from './routes/profile/profile-route';

export interface ApplicationContext {
	agentStateService: AgentStateService;
	userService: UserService;
	llmCallService: LlmCallService;
	functionCacheService: FunctionCacheService;
}

export interface AppFastifyInstance extends TypeBoxFastifyInstance, ApplicationContext {}

let applicationContext: ApplicationContext;

// Ensures the functions are registered
functionRegistry();

/**
 * @return the main application context
 */
export function appContext(): ApplicationContext {
	// Default to in-memory so unit tests don't initialise every time
	applicationContext ??= initInMemoryApplicationContext();
	return applicationContext;
}

/**
 * Creates the applications services and starts the Fastify server.
 */
export async function initApp(): Promise<void> {
	// If the process has the argument --db=file, or DATABASE=file env var, then use file based persistence
	const args = process.argv.slice(2); // Remove the first two elements (node and script path)
	const dbArg = args.find((arg) => arg.startsWith('--db='));
	const database = process.env.DATABASE;
	if (dbArg?.slice(5) === 'file' || database === 'file') {
		await initFileApplicationContext();
	} else if (database === 'memory') {
		initInMemoryApplicationContext();
	} else if (database === 'firestore') {
		await initFirestoreApplicationContext();
	} else {
		throw new Error(`Invalid value for DATABASE environment: ${database}`);
	}

	try {
		await initFastify({
			routes: [
				gitlabRoutesV1 as RouteDefinition,
				agentStartRoute as RouteDefinition,
				agentDetailsRoutes as RouteDefinition,
				agentExecutionRoutes as RouteDefinition,
				profileRoute as RouteDefinition,
				llmRoutes as RouteDefinition,
				llmCallRoutes as RouteDefinition,
				// Add your routes below this line
			],
			instanceDecorators: applicationContext, // This makes all properties on the ApplicationContext interface available on the fastify instance in the routes
			requestDecorators: {},
		});
	} catch (err: any) {
		logger.fatal(err, 'Could not start nous');
	}
}

export async function initFirestoreApplicationContext(): Promise<ApplicationContext> {
	logger.info('Initializing Firestore persistence');
	applicationContext = {
		agentStateService: new FirestoreAgentStateService(),
		userService: new FirestoreUserService(),
		llmCallService: new FirestoreLlmCallService(),
		functionCacheService: new FirestoreCacheService(),
	};
	await applicationContext.userService.ensureSingleUser();
	return applicationContext;
}

export async function initFileApplicationContext(): Promise<ApplicationContext> {
	logger.info('Initializing file based persistence');
	applicationContext = {
		agentStateService: new FileAgentStateService(),
		userService: new FileUserService(),
		llmCallService: new InMemoryLlmCallService(),
		functionCacheService: new FileFunctionCacheService(),
	};
	await applicationContext.userService.ensureSingleUser();
	return applicationContext;
}

export function initInMemoryApplicationContext(): ApplicationContext {
	applicationContext = {
		agentStateService: new InMemoryAgentStateService(),
		userService: new InMemoryUserService(),
		llmCallService: new InMemoryLlmCallService(),
		functionCacheService: new FileFunctionCacheService(),
	};
	applicationContext.userService.ensureSingleUser().catch();
	return applicationContext;
}
