import { Type } from '@sinclair/typebox';
import { send } from '#fastify/index';
import { LLMCall } from '#llm/llmCallService/llmCallService';
import { AppFastifyInstance } from '../../app';

const basePath = '/api/llms';
export async function llmCallRoutes(fastify: AppFastifyInstance) {
	fastify.get(
		`${basePath}/calls/agent/:agentId`,
		{
			schema: {
				params: Type.Object({
					agentId: Type.String(),
				}),
			},
		},
		async (req, reply) => {
			const { agentId } = req.params;
			const llmCalls: LLMCall[] = await fastify.llmCallService.getLlmCallsForAgent(agentId);
			send(reply, 200, llmCalls);
		},
	);
}
