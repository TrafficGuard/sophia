import { Type } from '@sinclair/typebox';
import { FastifyReply } from 'fastify';
import { send } from '#fastify/index';
import { User } from '#user/user';
import { currentUser } from '#user/userService/userContext';
import { AppFastifyInstance } from '../../app';

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
