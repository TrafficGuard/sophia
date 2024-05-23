import { User } from '../user';

export interface UserService {
	getUser(userId: string): Promise<User>;

	getUserByEmail(email: string): Promise<User | null>;

	createUser(user: Partial<User>): Promise<User>;

	/**
	 * When running in single-user mode returns the user
	 */
	ensureSingleUser(): Promise<void>;
	getSingleUser(): User;

	/**
	 * @param updates
	 * @param userId The current user if undefined. Admins can edit other users.
	 */
	updateUser(updates: Partial<User>, userId?: string): Promise<void>;

	disableUser(userId: string): Promise<void>;

	listUsers(): Promise<User[]>;
}
