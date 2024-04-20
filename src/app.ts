import { AgentStateService, AgentStateServiceFile } from '#agent/agentStateService';
import { RouteDefinition } from '#fastify/fastifyApp';
import { logger } from '#o11y/logger';
import { TypeBoxFastifyInstance, initFastify } from './fastify';
import { agentRoutesV1 } from './routes/agent/agentRoutes-v1';
import { gitlabRoutesV1 } from './routes/gitlab/gitlabRoutes-v1';

export interface ApplicationContext {
	agentStateService: AgentStateService;
}

export interface AppFastifyInstance extends TypeBoxFastifyInstance, ApplicationContext {}

let appContext: ApplicationContext;

function createApplicationContext(): ApplicationContext {
	return {
		agentStateService: new AgentStateServiceFile(),
	};
}

/** For setting in tests with mock/in-memory service implementations */
export function setApplicationContext(testAppContext: ApplicationContext): void {
	appContext = testAppContext;
}

export function appCtx(): ApplicationContext {
	appContext ??= createApplicationContext();
	return appContext;
}

export async function initApp(): Promise<void> {
	appContext = createApplicationContext();
	try {
		await initFastify({
			routes: [gitlabRoutesV1 as RouteDefinition, agentRoutesV1 as RouteDefinition],
			instanceDecorators: appContext,
			requestDecorators: {},
		});
	} catch (err: any) {
		logger.fatal(err, 'Could not start nous');
	}
}

/**
 * If the application is shutting down
 */
export function shutdown(): boolean {
	return false;
}
