import { send } from '#fastify/index';
import { LLM_REGISTRY } from '#llm/llmFactory';
import { AppFastifyInstance } from '../../app';

const basePath = '/api/llms';
export async function llmRoutes(fastify: AppFastifyInstance) {
	fastify.get(`${basePath}/list`, async (req, reply) => {
		send(reply, 200, Object.keys(LLM_REGISTRY));
	});
}
