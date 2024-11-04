import { Type } from '@sinclair/typebox';
import { FastifyReply } from 'fastify';
import { send, sendSuccess } from '#fastify/index';
import { userToJwtPayload } from '#fastify/jwt';
import { logger } from '#o11y/logger';
import { User } from '#user/user';
import { currentUser } from '#user/userService/userContext';
import { ROUTES } from '../../../frontend/src/app/routes';
import { env } from '../../../frontend/src/environments/.env';
import { AppFastifyInstance } from '../../app';

const AUTH_ERRORS = {
	INVALID_CREDENTIALS: 'Invalid credentials',
	USER_EXISTS: 'User already exists',
};

const basePath = '/api/auth';

export async function authRoutes(fastify: AppFastifyInstance) {
	// Authentication routes
	fastify.post(
		ROUTES.AUTH_SIGNIN,
		{
			schema: {
				body: Type.Object({
					email: Type.String(),
					password: Type.String(),
				}),
			},
		},
		async (req, reply) => {
			try {
				logger.debug(`signin email:${req.body.email}`);
				const user = await fastify.userService.authenticateUser(req.body.email, req.body.password);
				const token = await reply.jwtSign(userToJwtPayload(user));
				logger.debug(`signin success user:${JSON.stringify(user)}`);
				send(reply, 200, {
					user,
					accessToken: token,
				});
			} catch (error) {
				logger.info(error);
				// Return 400 and not 401 so the auth-interceptor doesn't catch it
				send(reply, 400, { error: error.message });
			}
		},
	);

	fastify.post(
		`${basePath}/signup`,
		{
			schema: {
				body: Type.Object({
					email: Type.String(),
					password: Type.String(),
				}),
			},
		},
		async (req, reply) => {
			try {
				const user = await fastify.userService.createUserWithPassword(req.body.email, req.body.password);
				const token = await reply.jwtSign(userToJwtPayload(user));

				send(reply, 200, {
					user,
					accessToken: token,
				});
			} catch (error) {
				logger.info(error);
				send(reply, 400, { error: error.message });
			}
		},
	);
}
