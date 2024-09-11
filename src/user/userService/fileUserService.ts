import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { existsSync } from 'node:fs';
import { logger } from '#o11y/logger';
import { sophiaDirName } from '../../appVars';
import { User } from '../user';
import { UserService } from './userService';

const SINGLE_USER_ID = 'user';

/**
 * Only supports single user mode
 */
export class FileUserService implements UserService {
	private readonly usersDirectory = `./${sophiaDirName}/users`;
	singleUser: User | undefined;

	constructor() {
		this.ensureSingleUser().catch(console.error);
	}

	async getUser(userId: string): Promise<User> {
		const filename = `${this.usersDirectory}/${userId}.json`;
		if (!existsSync(filename)) {
			throw new Error(`User Id:${userId} not found`);
		}
		try {
			const jsonString = readFileSync(filename).toString();
			return JSON.parse(jsonString) as User;
		} catch (error) {
			logger.error(error, `Error parsing user at ${filename}`);
			throw new Error(`User Id:${userId} not found`);
		}
	}

	async createUser(user: Partial<User>): Promise<User> {
		logger.debug(`createUser ${user}`);
		const newUser: User = {
			id: user.id,
			email: user.email ?? '',
			enabled: user.enabled ?? true,
			hilBudget: user.hilBudget ?? 0,
			hilCount: user.hilCount ?? 0,
			llmConfig: user.llmConfig ?? { anthropicKey: '', openaiKey: '', groqKey: '', togetheraiKey: '' },
			functionConfig: {},
		};
		mkdirSync(this.usersDirectory, { recursive: true });
		writeFileSync(`${this.usersDirectory}/${user.id}.json`, JSON.stringify(newUser));
		return newUser;
	}

	async updateUser(updates: Partial<User>, userId?: string): Promise<void> {
		const user = await this.getUser(userId ?? updates.id);
		Object.assign(user, updates);
		writeFileSync(`${this.usersDirectory}/${user.id}.json`, JSON.stringify(user));
	}

	async disableUser(userId: string): Promise<void> {
		const user = await this.getUser(userId);
		user.enabled = false;
		await this.updateUser(user);
	}

	async listUsers(): Promise<User[]> {
		const users: User[] = [];
		const files = readdirSync(this.usersDirectory);
		for (const file of files) {
			if (file.endsWith('.json')) {
				const jsonString = readFileSync(`${this.usersDirectory}/${file}`).toString();
				try {
					const user: User = JSON.parse(jsonString);
					users.push(user);
				} catch (e) {
					logger.warn('Unable to deserialize user file %o %s', file, e.message);
				}
			}
		}
		return users;
	}

	async ensureSingleUser(): Promise<void> {
		try {
			this.singleUser = await this.getUser(SINGLE_USER_ID);
		} catch (e) {
			this.singleUser = await this.createUser({ id: SINGLE_USER_ID, enabled: true, email: process.env.SINGLE_USER_EMAIL });
		}
	}

	getSingleUser(): User {
		return this.singleUser;
	}

	async getUserByEmail(email: string): Promise<User> {
		logger.debug(`getUserByEmail ${email}`);
		const user = (await this.listUsers()).find((user) => user.email === email);
		if (!user) throw new Error(`No user found with email ${email}`);
		return user;
	}
}
