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

export async function googleIapMiddleware(req: any, _res, next: () => void): Promise<void> {
	let email = req.headers['x-goog-authenticated-user-email'];
	if (!email) throw new Error('x-goog-authenticated-user-email header not found');
	if (Array.isArray(email)) email = email[0];
	// TODO validate the JWT https://cloud.google.com/iap/docs/signed-headers-howto#securing_iap_headers

	// remove accounts.google.com: prefix
	email = email.replace('accounts.google.com:', '');
	logger.debug(`IAP email ${email}`);

	let user = await appContext().userService.getUserByEmail(email);
	if (!user) {
		user = await appContext().userService.createUser({ email: email });
	}
	req.user = user;
	runWithUser(user, () => {
		logger.info('IAP runWithUser', user.id);
		next();
		logger.info('After next()');
	});
}
