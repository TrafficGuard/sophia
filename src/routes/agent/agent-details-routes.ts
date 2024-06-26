import { Type } from '@sinclair/typebox';
import { FastifyReply } from 'fastify';
import { AgentContext, serializeContext } from '#agent/agentContext';
import { send, sendBadRequest, sendSuccess } from '#fastify/index';
import { logger } from '#o11y/logger';
import { AppFastifyInstance } from '../../app';
import { functionRegistry } from '../../functionRegistry';

const basePath = '/api/agent/v1';
export async function agentDetailsRoutes(fastify: AppFastifyInstance) {
	fastify.get(`${basePath}/list`, {}, async (req, reply) => {
		const ctxs: AgentContext[] = await fastify.agentStateService.list();
		const response = ctxs.map(serializeContext);
		send(reply as FastifyReply, 200, response);
	});

	fastify.get(`${basePath}/functions`, {}, async (req, reply) => {
		send(
			reply as FastifyReply,
			200,
			functionRegistry().map((t) => t.name),
		);
	});

	fastify.get(`${basePath}/list/humanInLoop`, {}, async (req, reply) => {
		const ctxs: AgentContext[] = await fastify.agentStateService.listRunning();
		const response = ctxs.filter((ctx) => ctx.state === 'hil').map(serializeContext);
		send(reply, 200, response);
	});

	fastify.get(
		`${basePath}/details/:agentId`,
		{
			schema: {
				params: Type.Object({
					agentId: Type.String(),
				}),
			},
		},
		async (req, reply) => {
			const agentId = req.params.agentId;
			const ctx: AgentContext = await fastify.agentStateService.load(agentId);
			if (!ctx) return sendBadRequest(reply);
			const serializedContext = serializeContext(ctx);
			serializedContext.functions = functionRegistry().map((f) => f.name);
			send(reply, 200, serializedContext);
		},
	);

	fastify.post(
		`${basePath}/delete`,
		{
			schema: {
				body: Type.Object({
					agentIds: Type.Array(Type.String()),
				}),
			},
		},
		async (req, reply) => {
			const { agentIds } = req.body;
			try {
				await fastify.agentStateService.delete(agentIds);
				sendSuccess(reply, 'Agents deleted successfully');
			} catch (error) {
				logger.error('Error deleting agents:', error);
				sendBadRequest(reply, 'Error deleting agents');
			}
		},
	);
}
