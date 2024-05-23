import { Type } from '@sinclair/typebox';
import { FastifyReply } from 'fastify';
import { AgentContext, serializeContext } from '#agent/agentContext';
import { send, sendBadRequest, sendSuccess } from '#fastify/index';
import { sendHTML } from '#fastify/responses';
import { logger } from '#o11y/logger';
import { AppFastifyInstance } from '../../app';
import { toolFactory } from '../../functionDefinition/metadata';
import { toolRegistry } from '../../toolRegistry';

const basePath = '/api/agent/v1';
export async function agentDetailsRoutes(fastify: AppFastifyInstance) {
	fastify.get(`${basePath}/list`, {}, async (req, reply) => {
		const ctxs: AgentContext[] = await fastify.agentStateService.list();
		const response = ctxs.map(serializeContext);
		send(reply as FastifyReply, 200, response);
	});

	fastify.get(`${basePath}/tools`, {}, async (req, reply) => {
		send(
			reply as FastifyReply,
			200,
			toolRegistry().map((t) => t.name),
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
			send(reply, 200, serializeContext(ctx));
		},
	);
}
