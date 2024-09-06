export type ToolType =
	| 'filestore' // blob store, locally or S3, Cloud Storage etc
	| 'notification' // Sends a notification to the agent supervisor
	| 'scm' // Source Control Management, GitHub, GitLab
	| 'chat'; // For a chatbot that replies to a conversation

/**
 * @param object function class instance
 * @returns the tool type, if it exists
 */
export function toolType(object: any): ToolType | null {
	return object.getToolType ? object.getToolType() : null;
}

/**
 * Interface for when there can be multiple implementation of a type of tool.
 * Useful for Agent creation validation when there can only be one of a particular tool type selected
 */
export interface GetToolType {
	getToolType(): ToolType;
}
