import { DEFAULT_HEALTHCHECK } from '#fastify/fastifyApp';
import { logger } from '#o11y/logger';
import { runWithUser } from '#user/userService/userContext';
import { appContext } from '../app';

// Middleware function
export function singleUserMiddleware(req: any, _res, next: () => void): void {
	const user = appContext().userService.getSingleUser();
	req.user = user;
	runWithUser(user, () => {
		next();
	});
}

export function googleIapMiddleware(req: any, _res, next: () => void) {
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
		.then((user) => user ?? appContext().userService.createUser({ email: email }))
		.then((user) => {
			runWithUser(user, next);
		});
}
