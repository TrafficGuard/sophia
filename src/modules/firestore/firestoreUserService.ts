import { DocumentSnapshot, Firestore } from '@google-cloud/firestore';
import * as bcrypt from 'bcrypt';
import { LlmCall } from '#llm/llmCallService/llmCall';
import { logger } from '#o11y/logger';
import { span } from '#o11y/trace';
import { User } from '#user/user';
import { isSingleUser } from '#user/userService/userContext';
import { UserService } from '#user/userService/userService';
import { envVar } from '#utils/env-var';

/*** Google Firestore implementation of UserService*/
export class FirestoreUserService implements UserService {
	db: Firestore;
	singleUser: User | undefined;

	constructor() {
		this.db = new Firestore({
			projectId: process.env.FIRESTORE_EMULATOR_HOST ? 'demo-nous' : envVar('GCLOUD_PROJECT'),
			databaseId: process.env.FIRESTORE_DATABASE,
			ignoreUndefinedProperties: true,
		});
	}

	/**
	 * When running the application in single user mode there is
	 * a single user account which is automatically created and logged in.
	 */
	async ensureSingleUser(): Promise<void> {
		if (!isSingleUser()) return;
		if (!this.singleUser) {
			const users = await this.listUsers();
			if (users.length > 1) {
				const user = users.find((user) => user.email === process.env.SINGLE_USER_EMAIL);
				if (!user) throw new Error(`No user found with email ${process.env.SINGLE_USER_EMAIL}`);
				this.singleUser = user;
			} else if (users.length === 1) {
				this.singleUser = users[0];
				if (process.env.SINGLE_USER_EMAIL && this.singleUser.email && this.singleUser.email !== process.env.SINGLE_USER_EMAIL)
					logger.error(`Only user has email ${this.singleUser.email}. Expected ${process.env.SINGLE_USER_EMAIL}`);
			} else {
				this.singleUser = await this.createUser({
					email: process.env.SINGLE_USER_EMAIL,
					functionConfig: {},
					llmConfig: {},
					enabled: true,
					hilCount: 5,
					hilBudget: 1,
				});
			}
			logger.info(`Single user id: ${this.singleUser.id}`);
		}
	}

	@span({ userId: 0 })
	async getUser(userId: string): Promise<User> {
		const docRef = this.db.doc(`Users/${userId}`);
		const docSnap: DocumentSnapshot = await docRef.get();
		if (!docSnap.exists) {
			throw new Error(`User ${userId} does not exist`);
		}
		const data = docSnap.data() as User;
		return {
			...data,
			id: userId,
		};
	}

	@span({ email: 0 })
	async getUserByEmail(email: string): Promise<User | null> {
		const querySnapshot = await this.db.collection('Users').where('email', '==', email).get();
		const users = querySnapshot.docs.map((doc) => {
			const data = doc.data();
			return {
				...data,
				id: doc.id,
			} as User;
		});
		if (users.length === 0) return null;
		if (users.length > 1) throw new Error(`More than one user with email ${email} found`);
		return users[0];
	}

	@span({ email: 0 })
	async createUser(user: Partial<User>): Promise<User> {
		const docRef = this.db.collection('Users').doc();
		user.llmConfig ??= {};
		try {
			await docRef.set({ ...user });
			return this.getUser(docRef.id);
		} catch (error) {
			logger.error(error, 'Error creating user');
			throw error;
		}
	}

	@span()
	async updateUser(updates: Partial<User>, userId?: string): Promise<void> {
		const userDocRef = this.db.doc(`Users/${userId ?? updates.id}`);
		try {
			await userDocRef.update(updates);
			if (this.singleUser) this.singleUser = Object.assign(this.singleUser, updates);
		} catch (error) {
			logger.error(error, 'Error updating user');
			throw error;
		}
	}

	async disableUser(userId: string): Promise<void> {
		const userDocRef = this.db.doc(`Users/${userId}`);
		try {
			await userDocRef.update({ enabled: false });
		} catch (error) {
			logger.error(error, 'Error disabling user');
			throw error;
		}
	}

	@span()
	async listUsers(): Promise<User[]> {
		const querySnapshot = await this.db.collection('Users').get();
		return querySnapshot.docs.map((doc) => {
			const data = doc.data() as User;
			return {
				...data,
				id: doc.id,
			};
		});
	}

	getSingleUser(): User {
		return this.singleUser;
	}

	@span({ email: 0 })
	async authenticateUser(email: string, password: string): Promise<User> {
		let user: User;
		try {
			user = await this.getUserByEmail(email);
		} catch (e) {
			throw new Error('Server error');
		}

		if (!user) {
			throw new Error('Invalid credentials');
		}

		if (!user || !user.passwordHash) {
			throw new Error('Invalid credentials (no hash)');
		}

		const isValid = await bcrypt.compare(password, user.passwordHash);
		if (!isValid) {
			throw new Error('Invalid credentials');
		}
		try {
			await this.updateUser({ lastLoginAt: new Date() }, user.id);
		} catch (e) {
			logger.error('Error updating lastLoginAt in authenticateUser');
		}
		return user;
	}

	@span({ email: 0 })
	async createUserWithPassword(email: string, password: string): Promise<User> {
		const existingUser = await this.getUserByEmail(email);
		if (existingUser) {
			logger.debug(`User ${email} already exists`);
			throw new Error('User already exists');
		}

		const passwordHash = await bcrypt.hash(password, 10);
		return this.createUser({
			email,
			passwordHash,
			enabled: true,
			createdAt: new Date(),
			hilCount: 5,
			hilBudget: 1,
			functionConfig: {},
			llmConfig: {},
		});
	}

	@span({ userId: 0 })
	async updatePassword(userId: string, newPassword: string): Promise<void> {
		const passwordHash = await bcrypt.hash(newPassword, 10);
		await this.updateUser({ passwordHash }, userId);
	}
}
