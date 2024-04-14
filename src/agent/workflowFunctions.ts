import { func } from '#agent/functions';
import { funcClass } from './metadata';

export const WORKFLOW_COMPLETED_NAME = 'Workflow.completed';

export const WORKFLOW_REQUEST_FEEDBACK = 'Workflow.requestFeedback';

@funcClass(__filename)
export class Workflow {
	/**
	 * Pauses the workflow and request feedback/interaction from a supervisor when a decision or approval needs to be made before proceeding with the plan.
	 * @param decisionNotes {string} Notes on what decision or approval is required
	 */
	@func
	async requestFeedback(decisionNotes: string): Promise<void> {
		throw new Error(`Feedback requested: ${decisionNotes}`);
	}

	/**
	 * Notifies that the workflow has completed and there is no more work to be done, or that no more useful progress can be made with the functions.
	 * @param note {string} A short note explaining why the workflow is complete or cannot continue.
	 */
	@func
	async completed(note: string): Promise<void> {
		console.log('Workflow completed');
		console.log(note);
		console.log('Exiting...');
		process.exit(0);
	}
}
