import { User } from '#model/user';

export interface UserService {
	getCurrentUser(): Promise<User>;

	getUser(userId: string): Promise<User>;

	createUser(user: Partial<User>): Promise<User>;

	/**
	 * @param updates
	 * @param userId The current user if undefined. Admins can edit other users.
	 */
	updateUser(updates: Partial<User>, userId?: string): Promise<void>;

	disableUser(userId: string): Promise<void>;

	listUsers(): Promise<User[]>;
}
