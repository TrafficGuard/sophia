import { DocumentSnapshot, Firestore } from '@google-cloud/firestore';
import { logger } from '#o11y/logger';
import { envVar } from '#utils/env-var';
import { User } from '../user';
import { UserService } from './userService';

/*** Google Firestore implementation of UserService*/
export class FirestoreUserService implements UserService {
	db: Firestore;
	singleUser: User | undefined;

	constructor() {
		this.db = new Firestore({
			projectId: process.env.FIRESTORE_EMULATOR_HOST ? undefined : envVar('GCLOUD_PROJECT'),
			databaseId: process.env.FIRESTORE_DATABASE_ID,
			ignoreUndefinedProperties: true,
		});
	}

	/**
	 * When running the application in SINGLE_USER mode there is
	 * a single user account which is automatically created and logged in.
	 */
	async ensureSingleUser(): Promise<void> {
		if (process.env.SINGLE_USER !== 'true') return;
		if (!this.singleUser) {
			const users = await this.listUsers();
			if (users.length > 1) throw new Error('More than one user in the database');
			if (users.length === 1) {
				this.singleUser = users[0];
			} else {
				this.singleUser = await this.createUser({
					email: process.env.SINGLE_USER_EMAIL,
					toolConfig: {},
					llmConfig: {},
					enabled: true,
					hilCount: 5,
					hilBudget: 1,
				});
			}
			logger.info(`Single user id: ${this.singleUser.id}`);
		}
	}

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

	async createUser(user: Partial<User>): Promise<User> {
		const docRef = this.db.collection('Users').doc();
		// const userId = docRef.id;
		try {
			await docRef.set({ ...user });
			return this.getUser(docRef.id);
		} catch (error) {
			logger.error(error, 'Error creating user');
			throw error;
		}
	}

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
}
