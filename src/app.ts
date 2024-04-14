import { logger } from '#o11y/logger';
import { TypeBoxFastifyInstance, initFastify } from './fastify';
import { gitlabRoutesV1 } from './routes/gitlab/gitlabRoutes-v1';

// biome-ignore lint: complexity/noBannedTypes
export type ApplicationContext = {};

export interface AppFastifyInstance extends TypeBoxFastifyInstance, ApplicationContext {}

async function createApplicationContext(): Promise<ApplicationContext> {
	return {};
}

export async function initApp(): Promise<void> {
	const appContext = await createApplicationContext();
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
