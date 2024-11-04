import { FastifyReply, FastifyRequest } from 'fastify';
import { DEFAULT_HEALTHCHECK } from '#fastify/fastifyApp';
import { logger } from '#o11y/logger';
import { runWithUser } from '#user/userService/userContext';
import { ROUTES } from '../../frontend/src/app/routes';
import { appContext } from '../app';
import { getPayloadUserId } from './jwt';

// Middleware function
export function singleUserMiddleware(req: FastifyRequest, _res: any, next: () => void): void {
	console.log('singleUserMiddleware');
	const user = appContext().userService.getSingleUser();
	req.user = { userId: user.id, email: user.email };
	runWithUser(user, () => {
		next();
	});
}

export function jwtAuthMiddleware(req: FastifyRequest, reply: FastifyReply, done: () => void): void {
	// Skip auth for public endpoints
	if (req.raw.url.startsWith('/webhooks/') || req.raw.url === DEFAULT_HEALTHCHECK || req.raw.url.startsWith(ROUTES.AUTH_ROUTE_PREFIX)) {
		done();
		return;
	}

	// Verify and decode JWT token
	req
		.jwtDecode()
		.then((decoded) => {
			const userId = getPayloadUserId(decoded);
			return appContext().userService.getUser(userId);
		})
		.then((user) => {
			if (!user) {
				reply.code(401).send(new Error('User not found'));
				return;
			}

			req.user = {
				userId: user.id,
				email: user.email,
			};

			runWithUser(user, () => {
				done();
			});
		})
		.catch((err) => {
			reply.code(401).send(new Error('Invalid token - user not found'));
		});
}

export function googleIapMiddleware(req: FastifyRequest, reply: FastifyReply, next: () => void) {
	// It would be nicer if the health-check was earlier in the chain. Maybe when nextauthjs integration is done.
	if (req.raw.url.startsWith('/webhooks/') || req.raw.url === DEFAULT_HEALTHCHECK) {
		next();
		return;
	}
	let email = req.headers['x-goog-authenticated-user-email'];
	if (!email) throw new Error('x-goog-authenticated-user-email header not found');
	if (Array.isArray(email)) email = email[0];
	// TODO validate the JWT https://cloud.google.com/iap/docs/signed-headers-howto#securing_iap_headers

	// remove accounts.google.com: prefix
	email = email.replace('accounts.google.com:', '');
	logger.debug(`IAP email ${email}`);

	appContext()
		.userService.getUserByEmail(email)
		// Create the user if they don't exist in the database
		.then((user) => user ?? appContext().userService.createUser({ email: email }))
		.then((user) => {
			runWithUser(user, () => {
				next();
			});
		})
		.catch(() => {
			reply.code(500).send(new Error('Unable to get/create user'));
		});
}
