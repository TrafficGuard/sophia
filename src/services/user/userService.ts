import { User } from '#model/user';

export interface UserService {
	getUser(userId: string): Promise<User>;

	createUser(user: Partial<User>): Promise<User>;

	updateUser(userId: string, updates: Partial<User>): Promise<void>;

	disableUser(userId: string): Promise<void>;

	listUsers(): Promise<User[]>;
}
