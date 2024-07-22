import { Span } from '@opentelemetry/api';
import { AgentContext, agentContext, agentContextStorage, createContext } from '#agent/agentContext';
import { RunAgentConfig } from '#agent/agentRunner';
import { logger } from '#o11y/logger';
import { withActiveSpan } from '#o11y/trace';
import { errorToString } from '#utils/errors';
import { appContext } from '../app';

/**
 * Runs a workflow with an agentContext. This also persists the agent so its actions can be reviewed in the UI
 * @param config
 * @param workflow
 * @returns the agentId
 */
export async function runAgentWorkflow(config: RunAgentConfig, workflow: (agent: AgentContext) => any): Promise<string> {
	let context: AgentContext = createContext(config);

	return agentContextStorage.run(context, async () => {
		try {
			await withActiveSpan(config.agentName, async (span: Span) => {
				await workflow(context);
			});
			context = agentContext();
			context.state = 'completed';
			logger.info('completed');
		} catch (e) {
			logger.error(e);
			context = agentContext();
			context.state = 'error';
			context.error = errorToString(e);
		} finally {
			await appContext().agentStateService.save(context);
		}
		return context.agentId;
	});
}
