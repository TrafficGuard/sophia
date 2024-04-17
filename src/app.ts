import { AgentStateService, DrizzleAgentStateService } from '#agent/agentStateService';
import { logger } from '#o11y/logger';
import { TypeBoxFastifyInstance, initFastify } from './fastify';
import { gitlabRoutesV1 } from './routes/gitlab/gitlabRoutes-v1';

export type ApplicationContext = {
	agentStateService: AgentStateService;
};

export interface AppFastifyInstance extends TypeBoxFastifyInstance {} // , ApplicationContext

async function createApplicationContext(): Promise<ApplicationContext> {
	return {
		agentStateService: new DrizzleAgentStateService(),
	};
}

let appContext: ApplicationContext;

export function appCtx(): ApplicationContext {
	if (!appContext) throw new Error('ApplicationContext not initialized');
	return appContext;
}

export async function initApp(): Promise<void> {
	appContext = await createApplicationContext();
	try {
		await initFastify({
			routes: [gitlabRoutesV1],
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