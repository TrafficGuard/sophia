import { FastifyInstance } from 'fastify';
import { sendBadRequest } from './responses';

export interface RouteInterface {
	method: string | string[];
	version: string | string[];
	endpoint: string | string[];
}

export function loadOnRequestHooks(fastify: FastifyInstance) {
	fastify.addHook('onRequest', async (request: any, reply: any) => {
		const routerMethod = request.routerMethod;
		const routerPath = request.routerPath;
		if (!(routerMethod && routerPath)) {
			sendBadRequest(reply, 'The URL is incorrect');
			return;
		}

		request.custom = {};
		if (routerPath === '/health-check') {
			request.custom.requestRoute = {
				method: routerMethod,
				version: '',
				endpoint: 'health-check',
			} as RouteInterface;
			return;
		}
	});
}
