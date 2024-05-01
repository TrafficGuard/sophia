import { Type } from '@sinclair/typebox';
import { AgentContext } from '#agent/agentContext';
import { Agent } from '#agent/agentFunctions';
import { runAgent } from '#agent/agentRunner';
import { send, sendSuccess } from '#fastify/index';
import { logger } from '#o11y/logger';
import { AppFastifyInstance } from '../../app';

const v1BasePath = '/agent/v1';
export async function agentStartRoute(fastify: AppFastifyInstance) {
	/** Starts a new agent */
	fastify.post(
		`${v1BasePath}/run`,
		{
			schema: {
				body: Type.Object({}),
			},
		},
		async (req, reply) => {
			const agent = req.body as AgentContext;
			// TODO agent is missing the following properties from type AgentContext: agentId, executionId, name, isRetry, and 16 more.

			await fastify.agentStateService.save(agent);

			runAgent({
				agentName: agent.name,
				initialPrompt: agent.inputPrompt,
				llms: agent.llms,
				systemPrompt: agent.systemPrompt,
				toolbox: agent.toolbox,
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
