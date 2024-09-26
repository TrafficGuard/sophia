import { AgentStateService } from '#agent/agentStateService/agentStateService';
import { FileAgentStateService } from '#agent/agentStateService/fileAgentStateService';
import { InMemoryAgentStateService } from '#agent/agentStateService/inMemoryAgentStateService';
import { ChatService } from '#chat/chatTypes';
import { RouteDefinition } from '#fastify/fastifyApp';
import { firestoreApplicationContext } from '#firestore/firestoreApplicationContext';
import { InMemoryLlmCallService } from '#llm/llmCallService/inMemoryLlmCallService';
import { LlmCallService } from '#llm/llmCallService/llmCallService';
import { logger } from '#o11y/logger';
import { CodeReviewService } from '#swe/codeReview/codeReviewService';
import { InMemoryCodeReviewService } from '#swe/codeReview/memoryCodeReviewService';
import { FileUserService } from '#user/userService/fileUserService';
import { InMemoryUserService } from '#user/userService/inMemoryUserService';
import { UserService } from '#user/userService/userService';
import { FileFunctionCacheService } from './cache/fileFunctionCacheService';
import { FunctionCacheService } from './cache/functionCacheService';
import { TypeBoxFastifyInstance, initFastify } from './fastify';
import { functionRegistry } from './functionRegistry';
import { agentDetailsRoutes } from './routes/agent/agent-details-routes';
import { agentExecutionRoutes } from './routes/agent/agent-execution-routes';
import { agentStartRoute } from './routes/agent/agent-start-route';
import { chatRoutes } from './routes/chat/chat-routes';
import { codeRoutes } from './routes/code/code-routes';
import { gitlabRoutesV1 } from './routes/gitlab/gitlabRoutes-v1';
import { llmCallRoutes } from './routes/llms/llm-call-routes';
import { llmRoutes } from './routes/llms/llm-routes';
import { profileRoute } from './routes/profile/profile-route';
import { codeReviewRoutes } from './routes/scm/codeReviewRoutes';

export interface ApplicationContext {
	agentStateService: AgentStateService;
	userService: UserService;
	chatService: ChatService;
	llmCallService: LlmCallService;
	functionCacheService: FunctionCacheService;
	codeReviewService: CodeReviewService;
}

export interface AppFastifyInstance extends TypeBoxFastifyInstance, ApplicationContext {}

let applicationContext: ApplicationContext;

// Ensures all the functions are registered
functionRegistry();

/**
 * @return the main application context
 */
export function appContext(): ApplicationContext {
	// Default to in-memory so unit tests don't need to initialise every time
	applicationContext ??= initInMemoryApplicationContext();
	return applicationContext;
}

/**
 * Creates the applications services and starts the Fastify server.
 */
export async function initServer(): Promise<void> {
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
				codeReviewRoutes as RouteDefinition,
				chatRoutes as RouteDefinition,
				codeRoutes as RouteDefinition,
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
	// const firestoreModule = await import("./modules/firestore/firestoreApplicationContext.ts")
	// applicationContext = firestoreModule.firestoreApplicationContext()

	// const dynamicImport = new Function('specifier', 'return import(specifier)');
	// const firestoreModule = await dynamicImport('./modules/firestore/firestoreApplicationContext.cjs');
	// applicationContext = firestoreModule.firestoreApplicationContext();

	applicationContext = firestoreApplicationContext();

	await applicationContext.userService.ensureSingleUser();
	return applicationContext;
}

export async function initFileApplicationContext(): Promise<ApplicationContext> {
	logger.info('Initializing file based persistence');
	applicationContext = {
		agentStateService: new FileAgentStateService(),
		userService: new FileUserService(),
		chatService: {} as ChatService, // TODO implement
		llmCallService: new InMemoryLlmCallService(),
		functionCacheService: new FileFunctionCacheService(),
		codeReviewService: new InMemoryCodeReviewService(),
	};
	await applicationContext.userService.ensureSingleUser();
	return applicationContext;
}

export function initInMemoryApplicationContext(): ApplicationContext {
	applicationContext = {
		agentStateService: new InMemoryAgentStateService(),
		userService: new InMemoryUserService(),
		chatService: {} as ChatService, // TODO implement
		llmCallService: new InMemoryLlmCallService(),
		functionCacheService: new FileFunctionCacheService(),
		codeReviewService: new InMemoryCodeReviewService(),
	};
	applicationContext.userService.ensureSingleUser().catch();
	return applicationContext;
}
