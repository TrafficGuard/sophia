import { DocumentSnapshot, Firestore } from '@google-cloud/firestore';
import { AgentContext, AgentRunningState, deserializeAgentContext, serializeContext } from '#agent/agentContext';
import { logger } from '#o11y/logger';
import { span } from '#o11y/trace';
import { envVar } from '#utils/env-var';
import { AgentStateService } from './agentStateService';

/**
 * Google Firestore implementation of AgentStateService
 */
export class FirestoreAgentStateService implements AgentStateService {
	db: Firestore;

	constructor() {
		this.db = new Firestore({
			projectId: process.env.FIRESTORE_EMULATOR_HOST ? undefined : envVar('GCLOUD_PROJECT'),
			databaseId: process.env.FIRESTORE_DATABASE_ID,
			ignoreUndefinedProperties: true,
		});
	}

	@span()
	async save(state: AgentContext): Promise<void> {
		const serialized = serializeContext(state);
		serialized.lastUpdate = Date.now();
		const docRef = this.db.doc(`AgentContext/${state.agentId}`);
		try {
			await docRef.set(serialized);
		} catch (error) {
			logger.error(error, 'Error saving agent state');
			throw error;
		}
	}

	async updateState(ctx: AgentContext, state: AgentRunningState): Promise<void> {
		ctx.state = state;
		await this.save(ctx);
	}

	@span({ agentId: 0 })
	async load(agentId: string): Promise<AgentContext | null> {
		const docRef = this.db.doc(`AgentContext/${agentId}`);
		const docSnap: DocumentSnapshot = await docRef.get();
		if (!docSnap.exists) {
			return null;
		}
		const data = docSnap.data();
		return deserializeAgentContext({
			...data,
			agentId,
		});
	}

	@span()
	async list(): Promise<AgentContext[]> {
		const querySnapshot = await this.db.collection('AgentContext').orderBy('lastUpdate', 'desc').get();
		return await this.deserializeQuery(querySnapshot);
	}

	@span()
	async listRunning(): Promise<AgentContext[]> {
		// Needs an index TODO https://cloud.google.com/firestore/docs/query-data/multiple-range-fields
		const querySnapshot = await this.db.collection('AgentContext').where('state', '!=', 'completed').orderBy('lastUpdate', 'desc').get();
		return await this.deserializeQuery(querySnapshot);
	}

	private async deserializeQuery(querySnapshot: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>) {
		const contexts: AgentContext[] = [];
		for (const doc of querySnapshot.docs) {
			const data = doc.data();
			contexts.push(
				await deserializeAgentContext({
					...data,
					agentId: doc.id,
				}),
			);
		}
		return contexts;
	}

	async clear(): Promise<void> {
		const querySnapshot = await this.db.collection('AgentContext').get();
		for (const doc of querySnapshot.docs) {
			await doc.ref.delete();
		}
	}
}
import { Firestore, CollectionReference } from '@google-cloud/firestore';
import { AgentContext, AgentRunningState, deserializeAgentContext, serializeContext } from '#agent/agentContext';
import { AgentStateService } from '#agent/agentStateService/agentStateService';
import { logger } from '#o11y/logger';

export class FirestoreAgentStateService implements AgentStateService {
  private collection: CollectionReference;

  constructor(private firestore: Firestore) {
    this.collection = this.firestore.collection('agents');
  }

  async save(state: AgentContext): Promise<void> {
    state.lastUpdate = Date.now();
    await this.collection.doc(state.agentId).set(serializeContext(state));
  }

  async updateState(ctx: AgentContext, state: AgentRunningState): Promise<void> {
    ctx.state = state;
    await this.save(ctx);
  }

  async load(agentId: string): Promise<AgentContext | null> {
    const doc = await this.collection.doc(agentId).get();
    if (!doc.exists) return null;
    return await deserializeAgentContext(doc.data() as any);
  }

  async list(): Promise<AgentContext[]> {
    const snapshot = await this.collection.get();
    const contexts: AgentContext[] = [];
    for (const doc of snapshot.docs) {
      try {
        const ctx = await deserializeAgentContext(doc.data() as any);
        contexts.push(ctx);
      } catch (e) {
        logger.warn(`Unable to deserialize agent ${doc.id}: ${e.message}`);
      }
    }
    return contexts;
  }

  async listRunning(): Promise<AgentContext[]> {
    const snapshot = await this.collection.where('state', '!=', 'completed').get();
    return Promise.all(snapshot.docs.map(doc => deserializeAgentContext(doc.data() as any)));
  }

  async delete(ids: string[]): Promise<void> {
    const batch = this.firestore.batch();
    for (const id of ids) {
      batch.delete(this.collection.doc(id));
    }
    await batch.commit();
  }

  clear(): void {
    // This method is not implemented for Firestore as it's potentially dangerous.
    // If needed, it should be implemented with caution, possibly requiring admin privileges.
    throw new Error('Clear method is not implemented for Firestore');
  }
}
