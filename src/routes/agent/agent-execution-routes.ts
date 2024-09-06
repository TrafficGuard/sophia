import { Type } from '@sinclair/typebox';
import { LlmFunctions } from '#agent/LlmFunctions';
import { AgentContext } from '#agent/agentContextTypes';
import { cancelAgent, provideFeedback, resumeCompleted, resumeError, resumeHil } from '#agent/agentRunner';
import { runXmlAgent } from '#agent/xmlAgentRunner';
import { send, sendBadRequest } from '#fastify/index';
import { functionFactory } from '#functionSchema/functionDecorators';
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

	/** Resumes an agent in the hil (human in the loop) state */
	fastify.post(
		`${v1BasePath}/resume-hil`,
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

			await resumeHil(agentId, executionId, feedback);

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

	/** Resumes an agent in the completed state */
	fastify.post(
		`${v1BasePath}/resume-completed`,
		{
			schema: {
				body: Type.Object({
					agentId: Type.String(),
					executionId: Type.String(),
					instructions: Type.String(),
				}),
			},
		},
		async (req, reply) => {
			const { agentId, executionId, instructions } = req.body;

			try {
				await resumeCompleted(agentId, executionId, instructions);
				send(reply, 200);
			} catch (error) {
				logger.error(error, 'Error resuming completed agent');
				sendBadRequest(reply, 'Error resuming completed agent');
			}
		},
	);

	/** Updates the functions available to an agent */
	fastify.post(
		`${v1BasePath}/update-functions`,
		{
			schema: {
				body: Type.Object({
					agentId: Type.String(),
					functions: Type.Array(Type.String()),
				}),
			},
		},
		async (req, reply) => {
			const { agentId, functions } = req.body;

			try {
				const agent = await fastify.agentStateService.load(agentId);
				if (!agent) {
					throw new Error('Agent not found');
				}

				agent.functions = new LlmFunctions();
				for (const functionName of functions) {
					const FunctionClass = functionFactory()[functionName];
					if (FunctionClass) {
						agent.functions.addFunctionClass(FunctionClass);
					} else {
						logger.warn(`Function ${functionName} not found in function factory`);
					}
				}

				await fastify.agentStateService.save(agent);
				send(reply, 200, { message: 'Agent functions updated successfully' });
			} catch (error) {
				logger.error('Error updating agent functions:', error);
				sendBadRequest(reply, 'Error updating agent functions');
			}
		},
	);
}
