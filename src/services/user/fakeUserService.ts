import { User } from '#model/user';
import { UserService } from './userService';

export class FakeUserService implements UserService {
	users: User[] = [];

	async getUser(userId: string): Promise<User> {
		const user = this.users.find((user) => user.id === userId);
		if (!user) {
			throw new Error(`No user found with ID ${userId}`);
		}
		return user;
	}

	async updateUser(updates: Partial<User>, userId: string): Promise<void> {
		userId ??= 'fake';
		const user = await this.getUser(userId);
		Object.assign(user, updates);
	}

	async disableUser(userId: string): Promise<void> {
		const user = await this.getUser(userId);
		user.enabled = false;
	}

	async listUsers(): Promise<User[]> {
		return this.users;
	}

	createUser(user: Partial<User>): Promise<User> {
		const newUser: User = {
			id: user.id,
			email: user.email,
			enabled: user.enabled ?? true,
			hilBudget: user.hilBudget ?? 0,
			hilCount: user.hilCount ?? 0,
			llmConfig: user.llmConfig ?? { anthropicKey: '', openaiKey: '', groqKey: '', togetheraiKey: '' },
			gitlabConfig: user.gitlabConfig ?? { host: '', token: '', topLevelGroups: [] },
			githubConfig: user.githubConfig ?? { token: '' },
			jiraConfig: user.jiraConfig ?? { baseUrl: '', email: '', token: '' },
			perplexityKey: user.perplexityKey ?? '',
		};
		this.users.push(newUser);
		return Promise.resolve(newUser);
	}

	getCurrentUser(): Promise<User> {
		return this.getUser('fake');
	}
}
