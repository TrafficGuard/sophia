import { Type } from '@sinclair/typebox';
import { AgentContext } from '#agent/agentContext';
import { cancelAgent, provideFeedback, resumeError, runAgent } from '#agent/xmlAgentRunner';
import { send, sendBadRequest } from '#fastify/index';
import { logger } from '#o11y/logger';
import { AppFastifyInstance, appContext } from '../../app';

const v1BasePath = '/api/agent/v1';
export async function agentExecutionRoutes(fastify: AppFastifyInstance) {
	/** Provides feedback to an agent */
	fastify.post(
		`${v1BasePath}/feedback`,
		{
			schema: {
				body: Type.Object({
					agentId: Type.String(),
					executionId: Type.String(),
					feedback: Type.String(),
				}),
			},
		},
		async (req, reply) => {
			const { agentId, feedback, executionId } = req.body;

			await provideFeedback(agentId, executionId, feedback);

			send(reply, 200);
		},
	);

	/** Resumes an agent in the error state */
	fastify.post(
		`${v1BasePath}/resume-error`,
		{
			schema: {
				body: Type.Object({
					agentId: Type.String(),
					executionId: Type.String(),
					feedback: Type.String(),
				}),
			},
		},
		async (req, reply) => {
			const { agentId, executionId, feedback } = req.body;

			await resumeError(agentId, executionId, feedback);

			send(reply, 200);
		},
	);

	// Cancels an agent and sets it to the completed state
	fastify.post(
		`${v1BasePath}/cancel`,
		{
			schema: {
				body: Type.Object({
					agentId: Type.String(),
					executionId: Type.String(),
					reason: Type.String(),
				}),
			},
		},
		async (req, reply) => {
			const { agentId, executionId, reason } = req.body;

			await cancelAgent(agentId, executionId, reason);
			send(reply, 200);
		},
	);
}
