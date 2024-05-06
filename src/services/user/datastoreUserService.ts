import { Datastore } from '@google-cloud/datastore';
import { User } from '#model/user';
import { envVar } from '#utils/env-var';
import { UserService } from './userService';

export class DatastoreUserService implements UserService {
	private datastore: Datastore = new Datastore({
		projectId: envVar('GCLOUD_PROJECT'),
		// keyFilename: '/ path/ to/ keyfile. json'
		databaseId: process.env.DATASTORE_DATABASE_ID,
	});

	async getUser(userId: string): Promise<User> {
		const key = this.datastore.key(['User', userId]);
		const [user] = await this.datastore.get(key);
		return user;
	}

	async updateUser(userId: string, updates: Partial<User>): Promise<void> {
		const key = this.datastore.key(['User', userId]);
		const user = this.datastore.entity(key, updates);
		await this.datastore.update(user);
	}

	async disableUser(userId: string): Promise<void> {
		await this.updateUser(userId, { enabled: false });
	}

	async listUsers(): Promise<User[]> {
		const query = this.datastore.createQuery('User');
		const [users] = await this.datastore.runQuery(query);
		return users;
	}

	async createUser(user: Partial<User>): Promise<User> {
		// TODO implement properly
		return user as User;
	}
}
