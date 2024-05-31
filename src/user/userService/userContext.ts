import { AsyncLocalStorage } from 'async_hooks';
import { agentContext } from '#agent/agentContext';
import { User } from '#user/user';
import {appContext} from "../../app";

const userContextStorage = new AsyncLocalStorage<User>();

/**
 * Sets the user on an AsyncLocalStorage store so the user available via the currentUser() function for the duration of the provided function call
 * @param user the user set for the function execution
 * @param fn the function which will have the user available via currentUser() during execution
 */
export function runWithUser(user: User, fn: () => any) {
	userContextStorage.run(user, fn);
}

/**
 * @returns If called in an agent's execution, returns the agent's user, otherwise the user from a web request, or the single user if in single user mode.
 */
export function currentUser(): User {
	const agent = agentContext();
	if (agent) return agent.user;

	const user = userContextStorage.getStore()
	if (!user) {
		if (process.env.SINGLE_USER === 'true') {
			return appContext().userService.getSingleUser()
		}
		throw new Error('User has not been set on the userContextStorage')
	}
	return user;
}

/**
 * Gets the current users configuration for tool
 * @param toolType The tool class
 */
export function toolConfig(toolType: any): Record<string, any> {
	return currentUser().toolConfig[toolType.name] ?? {};
}
