import { AgentStateService } from '#agent/agentStateService/agentStateService';
import { ChatService } from '#chat/chatTypes';
import { LlmCallService } from '#llm/llmCallService/llmCallService';
import { inMemoryApplicationContext } from '#modules/memory/inMemoryApplicationContext';
import { logger } from '#o11y/logger';
import { CodeReviewService } from '#swe/codeReview/codeReviewService';
import { UserService } from '#user/userService/userService';
import { FunctionCacheService } from './cache/functionCacheService';

export interface ApplicationContext {
	agentStateService: AgentStateService;
	userService: UserService;
	chatService: ChatService;
	llmCallService: LlmCallService;
	functionCacheService: FunctionCacheService;
	codeReviewService: CodeReviewService;
}

export let applicationContext: ApplicationContext;

export async function initApplicationContext(): Promise<ApplicationContext> {
	if (applicationContext) throw new Error('Application context already initialized');
	const database = process.env.DATABASE;
	if (database === 'memory') {
		initInMemoryApplicationContext();
	} else if (database === 'firestore') {
		await initFirestoreApplicationContext();
	} else {
		throw new Error(`Invalid value for DATABASE environment: ${database}`);
	}
	return applicationContext;
}

/**
 * @return the main application context
 */
export function appContext(): ApplicationContext {
	// Default to in-memory so unit tests don't need to initialise every time
	applicationContext ??= initInMemoryApplicationContext();
	return applicationContext;
}

export async function initFirestoreApplicationContext(): Promise<ApplicationContext> {
	if (applicationContext) throw new Error('Application context already initialized');
	logger.info('Initializing Firestore persistence');
	const firestoreModule = await import('./modules/firestore/firestoreModule.cjs');
	applicationContext = firestoreModule.firestoreApplicationContext();

	await applicationContext.userService.ensureSingleUser();
	return applicationContext;
}

export function initInMemoryApplicationContext(): ApplicationContext {
	// if (applicationContext) throw new Error('Application context already initialized');
	applicationContext = inMemoryApplicationContext();
	applicationContext.userService.ensureSingleUser().catch();
	return applicationContext;
}
