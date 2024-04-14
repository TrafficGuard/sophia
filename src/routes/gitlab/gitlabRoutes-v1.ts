import { Gitlab } from '@gitbeaker/rest';
import { Type } from '@sinclair/typebox';
import { send, sendSuccess } from '#fastify/index';
import { logger } from '#o11y/logger';
import { envVar } from '#utils/env-var';
import { AppFastifyInstance } from '../../app';

const config = {
	host: envVar('GITLAB_HOST'),
	token: envVar('GITLAB_TOKEN'),
	topLevelGroups: JSON.parse(envVar('GITLAB_GROUPS')),
};
const api = new Gitlab({
	host: config.host,
	token: config.token,
});

const basePath = '/gitlab/v1';
export async function gitlabRoutesV1(fastify: AppFastifyInstance) {
	// /get
	// See https://docs.gitlab.com/ee/user/project/integrations/webhook_events.html#merge-request-events
	fastify.post(
		`${basePath}/webhook`,
		{
			// using sinclair typebox the body can have a field labels which can have any key to string value
			schema: {
				body: Type.Any(),
			},
		},
		async (req, reply) => {
			logger.debug('/gitlab/webhook route');
			const event = req.body as any;
			logger.debug('Gitlab webhook %o', event);

			if (event.object_attributes.draft) sendSuccess(reply);

			const id = event.last_commit.id;
			const author = event.last_commit.author.email;

			const diffs = await api.MergeRequests.allDiffs(event.project.id, event.object_attributes.id, { perPage: 100 });

			// TODO Start a new workflow which reviews the merge request

			send(reply, 200);
			// try {
			//     send(reply, 200, reservation);
			//     sendSuccess(reply, "No reservation found.");
			// } catch (e: any) {
			//     logger.error(e);
			//     sendBadRequest(reply, e);
			// }
		},
	);
}
