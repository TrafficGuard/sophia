import { Type } from '@sinclair/typebox';
import { AgentContext } from '#agent/agentContext';
import { runAgent } from '#agent/agentRunner';
import { send, sendSuccess } from '#fastify/index';
import { logger } from '#o11y/logger';
import { AppFastifyInstance } from '../../app';

const basePath = '/agent/v1';
export async function agentRoutesV1(fastify: AppFastifyInstance) {
	fastify.post(
		`${basePath}/resume`,
		{
			schema: {
				body: Type.Object({
					executionId: Type.String(),
				}),
			},
		},
		async (req, reply) => {
			const ctx: AgentContext = await fastify.agentStateService.load(req.body.executionId);

			runAgent({
				agentName: ctx.name,
				initialPrompt: ctx.inputPrompt,
				llms: ctx.llms,
				systemPrompt: ctx.systemPrompt,
				toolbox: ctx.toolbox,
			});

			send(reply, 200);
			// try {
			//     send(reply, 200, reservation);
			//     sendSuccess(reply, "No reservation found.");
			// } catch (e: any) {
			//     logger.error(e);
			//     sendBadRequest(reply, e);
			// }
		},
	);
}
