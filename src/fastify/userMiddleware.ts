import { FastifyRequest } from 'fastify';
import { runWithUser } from '#user/userService/userContext';
import { appContext } from '../app';

// Middleware function
export function singleUserMiddleware(req: any, _res, next): void {
	const user = appContext().userService.getSingleUser();
	req.user = user;
	runWithUser(user, () => {
		next();
	});
}

export async function googleIapMiddleware(req: any, _res, next): Promise<void> {
	let email = req.headers['x-goog-authenticated-user-email'];
	if (!email) throw new Error('x-goog-authenticated-user-email header not found');
	if (Array.isArray(email)) email = email[0];
	// TODO validate the JWT https://cloud.google.com/iap/docs/signed-headers-howto#securing_iap_headers

	let user = await appContext().userService.getUserByEmail(email);
	if (!user) {
		user = await appContext().userService.createUser({ email: email });
	}
	req.user = user;
	runWithUser(user, () => {
		next();
	});
}
