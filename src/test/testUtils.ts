import { FastifyInstance } from 'fastify';
import { initApplicationContext } from '../applicationContext';
import { initFastify } from '../fastify/fastifyApp';

export async function createTestFastify(): Promise<FastifyInstance> {
	const applicationContext = await initApplicationContext();
	const fastify = await initFastify({
		routes: [],
		...applicationContext,
	});
	return fastify;
}
