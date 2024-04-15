import { func } from '#agent/functions';
import { logger } from '#o11y/logger';
import { funcClass } from './metadata';

export const AGENT_COMPLETED_NAME = 'Agent.completed';

export const AGENT_REQUEST_FEEDBACK = 'Agent.requestFeedback';

@funcClass(__filename)
export class Agent {
	/**
	 * Pauses the work and request feedback/interaction from a supervisor when a decision or approval needs to be made before proceeding with the plan.
	 * @param decisionNotes {string} Notes on what decision or approval is required
	 */
	@func()
	async requestFeedback(decisionNotes: string): Promise<void> {
		logger.info(`Feedback requested: ${decisionNotes}`);
	}

	/**
	 * Notifies that the task has completed and there is no more work to be done, or that no more useful progress can be made with the functions.
	 * @param note {string} A short note explaining why the work/task is complete or cannot continue.
	 */
	@func()
	async completed(note: string): Promise<void> {
		logger.info('Agent completed');
		logger.info(note);
	}
}
