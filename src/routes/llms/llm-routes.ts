import { send } from '#fastify/index';
import { getLLM, llmTypes } from '#llm/llmFactory';
import { AppFastifyInstance } from '../../server';

const basePath = '/api/llms';

export async function llmRoutes(fastify: AppFastifyInstance) {
	// Returns the LLMs which are configured for the current user
	fastify.get(`${basePath}/list`, async (req, reply) => {
		const configuredLLMs = llmTypes()
			.map((llm) => getLLM(llm.id))
			.filter((llm) => llm.isConfigured())
			.map((llm) => ({ id: llm.getId(), name: llm.getDisplayName(), isConfigured: true }));
		send(reply, 200, configuredLLMs);
	});
}
