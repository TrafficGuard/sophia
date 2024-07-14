import { Type } from '@sinclair/typebox';
import { LlmFunctions } from '#agent/LlmFunctions';
import { AgentContext, agentContextStorage, createContext } from '#agent/agentContext';
import { RunAgentConfig } from '#agent/agentRunner';
import { send, sendSuccess } from '#fastify/index';
import { GitLab } from '#functions/scm/gitlab';
import { GEMINI_1_5_PRO_LLMS } from '#llm/models/vertexai';
import { logger } from '#o11y/logger';
import { currentUser } from '#user/userService/userContext';
import { AppFastifyInstance } from '../../app';
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
				llms: GEMINI_1_5_PRO_LLMS(),
				functions: new LlmFunctions(),
				user: currentUser(), // TODO need to specify a user for code reviews
				initialPrompt: '',
				humanInLoop: envVarHumanInLoopSettings(),
			};
			const context: AgentContext = createContext(config);
			agentContextStorage.enterWith(context);

			new GitLab().reviewMergeRequest(event.project.id, event.object_attributes.id).catch((error) => logger.error(error, 'Error reviewing merge request'));

			send(reply, 200);
		},
	);
}
