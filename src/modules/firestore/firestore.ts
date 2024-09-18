import { Firestore } from '@google-cloud/firestore';
import { envVar } from '#utils/env-var';

let db: Firestore;

export function firestoreDb(): Firestore {
	if (!db) {
		db = new Firestore({
			projectId: process.env.FIRESTORE_EMULATOR_HOST ? 'demo-sophia' : envVar('GCLOUD_PROJECT'),
			databaseId: process.env.FIRESTORE_DATABASE,
			ignoreUndefinedProperties: true,
		});
	}
	return db;
}
