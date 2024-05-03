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

	async updateUser(userId: string, updates: Partial<User>): Promise<void> {
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
		return Promise.resolve(undefined);
	}
}
