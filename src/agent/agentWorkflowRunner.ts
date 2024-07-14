import { Span } from '@opentelemetry/api';
import { AgentContext, agentContext, agentContextStorage, createContext } from '#agent/agentContext';
import { RunAgentConfig } from '#agent/agentRunner';
import { logger } from '#o11y/logger';
import { withActiveSpan } from '#o11y/trace';
import { appContext } from '../app';

/**
 * Runs a workflow with an agentContext. This also makes the workflow display in the Agents UI
 * @param config
 * @param workflow
 */
export async function runAgentWorkflow(config: RunAgentConfig, workflow: () => any): Promise<string> {
	let context: AgentContext = createContext(config);
	agentContextStorage.enterWith(context);

	try {
		await withActiveSpan(config.agentName, async (span: Span) => {
			await workflow();
		});
		context = agentContext();
		context.state = 'completed';
		logger.info('completed');
	} catch (e) {
		logger.error(e);
		context = agentContext();
		context.state = 'error';
		context.error = JSON.stringify(e);
	} finally {
		await appContext().agentStateService.save(context);
	}
	return context.agentId;
}
