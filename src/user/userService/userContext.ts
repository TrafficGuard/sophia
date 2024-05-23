import { AsyncLocalStorage } from 'async_hooks';
import { AgentContext, agentContext } from '#agent/agentContext';
import { User } from '#user/user';
import { appContext } from '../../app';

const userContextStorage = new AsyncLocalStorage<User>();

export function runWithUser(user: User, fn: () => any) {
	userContextStorage.run(user, fn);
}

export function currentUser(): User {
	const agent = agentContext();
	if (agent) return agent.user;

	if (process.env.SINGLE_USER === 'true') {
		return appContext().userService.getSingleUser();
	}
	throw new Error('Only single user currently supported');
}

export function toolConfig(toolType: any): Record<string, any> {
	return currentUser().toolConfig[toolType.name] ?? {};
}
