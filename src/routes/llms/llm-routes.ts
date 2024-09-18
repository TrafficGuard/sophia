import { send } from '#fastify/index';
import { LLM_FACTORY, LLM_TYPES, getLLM } from '#llm/llmFactory';
import { AppFastifyInstance } from '../../app';

const basePath = '/api/llms';

export async function llmRoutes(fastify: AppFastifyInstance) {
	fastify.get(`${basePath}/list`, async (req, reply) => {
		console.log(Object.keys(LLM_FACTORY));
		console.log(Object.values(LLM_TYPES));
		const configuredLLMs = LLM_TYPES.map((llm) => getLLM(llm.id))
			.filter((llm) => llm.isConfigured())
			.map((llm) => ({ id: llm.getId(), name: llm.getDisplayName(), isConfigured: true }));
		send(reply, 200, configuredLLMs);
	});
}
