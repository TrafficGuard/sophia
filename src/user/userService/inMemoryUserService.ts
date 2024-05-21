import { User } from '../user';
import { UserService } from './userService';

const SINGLE_USER_ID = 'id';

const singleUser: User = {
	enabled: false,
	hilBudget: 0,
	hilCount: 0,
	llmConfig: {},
	id: SINGLE_USER_ID,
	email: 'user@domain.com',
	toolConfig: {},
};

export class InMemoryUserService implements UserService {
	users: User[] = [singleUser];

	async getUser(userId: string): Promise<User> {
		const user = this.users.find((user) => user.id === userId);
		if (!user) {
			throw new Error(`No user found with ID ${userId}`);
		}
		return user;
	}

	async updateUser(updates: Partial<User>, userId?: string): Promise<void> {
		userId ??= SINGLE_USER_ID;
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
			toolConfig: {},
		};
		this.users.push(newUser);
		return Promise.resolve(newUser);
	}

	async ensureSingleUser(): Promise<void> {}

	getSingleUser(): User {
		return singleUser;
	}
}
