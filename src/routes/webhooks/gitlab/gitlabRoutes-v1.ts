import { Type } from '@sinclair/typebox';
import { FastifyReply } from 'fastify';
import { agentContextStorage, createContext } from '#agent/agentContextLocalStorage';
import { AgentContext } from '#agent/agentContextTypes';
import { RunAgentConfig } from '#agent/agentRunner';
import { send, sendSuccess } from '#fastify/index';
import { GitLab } from '#functions/scm/gitlab';
import { ClaudeVertexLLMs } from '#llm/services/anthropic-vertex';
import { defaultGoogleCloudLLMs } from '#llm/services/defaultLlms';
import { logger } from '#o11y/logger';
import { envVar } from '#utils/env-var';
import { appContext } from '../../../applicationContext';
import { envVarHumanInLoopSettings } from '../../../cli/cliHumanInLoop';
import { AppFastifyInstance } from '../../../server';

const basePath = '/api/webhooks';

export async function gitlabRoutesV1(fastify: AppFastifyInstance) {
	fastify.get(`${basePath}/test`, {}, async (req, reply) => {
		send(reply as FastifyReply, 200, { message: 'ok' });
	});

	// /get
	// See https://docs.gitlab.com/ee/user/project/integrations/webhook_events.html#merge-request-events
	fastify.post(
		`${basePath}/gitlab`,
		{
			schema: {
				body: Type.Any(),
			},
		},
		async (req, reply) => {
			logger.debug('/webhooks/gitlab route');
			const event = req.body as any;
			logger.debug('Gitlab webhook %o', event);

			if (event.object_attributes.draft) sendSuccess(reply);

			const config: RunAgentConfig = {
				agentName: `MR review - ${event.object_attributes.title}`,
				llms: defaultGoogleCloudLLMs(),
				functions: [],
				user: await appContext().userService.getUserByEmail(envVar('GITLAB_REVIEW_USER_EMAIL')),
				initialPrompt: '',
				humanInLoop: envVarHumanInLoopSettings(),
			};
			const context: AgentContext = createContext(config);
			const mergeRequestId = `${event.project.id}, ${event.object_attributes.id}, ${event.object_attributes.title}`;
			logger.info(`Agent ${context.agentId} reviewing merge request ${mergeRequestId}`);

			agentContextStorage.run(context, () => {
				new GitLab()
					.reviewMergeRequest(event.project.id, event.object_attributes.id)
					.then(() => {
						logger.debug(`Competed review of merge request ${mergeRequestId}`);
					})
					.catch((error) => logger.error(error, `Error reviewing merge request ${mergeRequestId}`));
			});

			send(reply, 200);
		},
	);
}
