import { send } from '#fastify/index';
import { LLM_TYPES } from '#llm/llmFactory';
import { AppFastifyInstance } from '../../app';

const basePath = '/api/llms';

export async function llmRoutes(fastify: AppFastifyInstance) {
	fastify.get(`${basePath}/list`, async (req, reply) => {
		send(reply, 200, LLM_TYPES);
	});
}
