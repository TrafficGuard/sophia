import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { existsSync } from 'node:fs';
import * as bcrypt from 'bcrypt';
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
	private readonly passwordsFile: string;
	private singleUser: User | undefined;

	constructor() {
		this.passwordsFile = `${this.usersDirectory}/passwords.json`;
		this.ensureSingleUser().catch(console.error);
	}

	private async getPasswordHash(userId: string): Promise<string | undefined> {
		if (!existsSync(this.passwordsFile)) return undefined;
		const passwords = JSON.parse(readFileSync(this.passwordsFile).toString());
		return passwords[userId];
	}

	private async savePasswordHash(userId: string, hash: string): Promise<void> {
		const passwords = existsSync(this.passwordsFile) ? JSON.parse(readFileSync(this.passwordsFile).toString()) : {};
		passwords[userId] = hash;
		writeFileSync(this.passwordsFile, JSON.stringify(passwords));
	}

	async authenticateUser(email: string, password: string): Promise<User> {
		const user = await this.getUserByEmail(email);
		const hash = await this.getPasswordHash(user.id);
		if (!hash) {
			throw new Error('Invalid credentials');
		}

		const isValid = await bcrypt.compare(password, hash);
		if (!isValid) {
			throw new Error('Invalid credentials');
		}

		await this.updateUser({ lastLoginAt: new Date() }, user.id);
		return user;
	}

	async createUserWithPassword(email: string, password: string): Promise<User> {
		const existingUser = await this.getUserByEmail(email).catch(() => null);
		if (existingUser) {
			throw new Error('User already exists');
		}

		const passwordHash = await bcrypt.hash(password, 10);
		const user = await this.createUser({
			email,
			enabled: true,
			createdAt: new Date(),
			hilCount: 5,
			hilBudget: 1,
			functionConfig: {},
			llmConfig: {},
		});

		await this.savePasswordHash(user.id, passwordHash);
		return user;
	}

	async updatePassword(userId: string, newPassword: string): Promise<void> {
		const passwordHash = await bcrypt.hash(newPassword, 10);
		await this.savePasswordHash(userId, passwordHash);
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
			createdAt: new Date(),
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
