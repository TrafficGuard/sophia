import { Type } from '@sinclair/typebox';
import { agentContextStorage, createContext } from '#agent/agentContextLocalStorage';
import { AgentContext } from '#agent/agentContextTypes';
import { RunAgentConfig } from '#agent/agentRunner';
import { send, sendSuccess } from '#fastify/index';
import { GitLab } from '#functions/scm/gitlab';
import { ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { logger } from '#o11y/logger';
import { envVar } from '#utils/env-var';
import { AppFastifyInstance, appContext } from '../../app';
import { envVarHumanInLoopSettings } from '../../cli/cliHumanInLoop';

const basePath = '/api/webhooks';

export async function gitlabRoutesV1(fastify: AppFastifyInstance) {
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
				llms: ClaudeVertexLLMs(),
				functions: [],
				user: await appContext().userService.getUserByEmail(envVar('GITLAB_REVIEW_USER_EMAIL')),
				initialPrompt: '',
				humanInLoop: envVarHumanInLoopSettings(),
			};
			const context: AgentContext = createContext(config);
			agentContextStorage.run(context, () => {
				new GitLab()
					.reviewMergeRequest(event.project.id, event.object_attributes.id)
					.catch((error) => logger.error(error, `Error reviewing merge request ${event.project.id}, ${event.object_attributes.id}`));
			});

			send(reply, 200);
		},
	);
}
