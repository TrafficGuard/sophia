import { Type } from '@sinclair/typebox';
import { FastifyReply } from 'fastify';
import { send, sendSuccess } from '#fastify/index';
import { logger } from '#o11y/logger';
import { User } from '#user/user';
import { AppFastifyInstance } from '../../app';

import { currentUser } from '#user/userService/userContext';

const basePath = '/api/profile';
export async function profileRoute(fastify: AppFastifyInstance) {
	fastify.get(`${basePath}/view`, async (req, reply) => {
		const user: User = currentUser();

		send(reply, 200, user);
	});

	fastify.post(
		`${basePath}/update`,
		{
			schema: {
				body: Type.Object({
					user: Type.Object({
						email: Type.String(),
					}),
				}),
			},
		},
		async (req, reply) => {
			const user = req.body.user;
			await fastify.userService.updateUser(user);
			send(reply as FastifyReply, 200);
		},
	);
}
