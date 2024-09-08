import { send } from '#fastify/index';
import { LLM_FACTORY, LLM_TYPES } from '#llm/llmFactory';
import { AppFastifyInstance } from '../../app';

const basePath = '/api/llms';

export async function llmRoutes(fastify: AppFastifyInstance) {
	fastify.get(`${basePath}/list`, async (req, reply) => {
		const configuredLLMs = LLM_TYPES.filter((llm) => LLM_FACTORY[llm.id])
			.filter((llm) => LLM_FACTORY[llm.id]().isConfigured())
			.map((llm) => ({ ...llm, isConfigured: true }));
		send(reply, 200, configuredLLMs);
	});
}
