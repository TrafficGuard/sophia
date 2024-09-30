import { DocumentSnapshot, Firestore } from '@google-cloud/firestore';
import { LlmFunctions } from '#agent/LlmFunctions';
import { AgentContext, AgentRunningState } from '#agent/agentContextTypes';
import { deserializeAgentContext, serializeContext } from '#agent/agentSerialization';
import { AgentStateService } from '#agent/agentStateService/agentStateService';
import { functionFactory } from '#functionSchema/functionDecorators';
import { logger } from '#o11y/logger';
import { span } from '#o11y/trace';
import { firestoreDb } from './firestore';

/**
 * Google Firestore implementation of AgentStateService
 */
export class FirestoreAgentStateService implements AgentStateService {
	db: Firestore = firestoreDb();

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
		} as Record<keyof AgentContext, any>);
	}

	@span()
	async list(): Promise<AgentContext[]> {
		// TODO limit the fields retrieved for performance, esp while functionCallHistory and memory is on the AgentContext object
		const keys: Array<keyof AgentContext> = ['agentId', 'name', 'state', 'cost', 'error', 'lastUpdate', 'userPrompt', 'inputPrompt'];
		const querySnapshot = await this.db
			.collection('AgentContext')
			.select(...keys)
			.orderBy('lastUpdate', 'desc')
			.get();
		return this.deserializeQuery(querySnapshot);
	}

	@span()
	async listRunning(): Promise<AgentContext[]> {
		// Needs an index TODO https://cloud.google.com/firestore/docs/query-data/multiple-range-fields
		const querySnapshot = await this.db.collection('AgentContext').where('state', '!=', 'completed').orderBy('lastUpdate', 'desc').get();
		return this.deserializeQuery(querySnapshot);
	}

	private async deserializeQuery(querySnapshot: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>) {
		const contexts: AgentContext[] = [];
		for (const doc of querySnapshot.docs) {
			const data = doc.data();
			// TODO need to await for deserialization in multi-user environment
			contexts.push({
				...data,
				agentId: doc.id,
			} as AgentContext);
		}
		return contexts;
	}

	async clear(): Promise<void> {
		const querySnapshot = await this.db.collection('AgentContext').get();
		for (const doc of querySnapshot.docs) {
			await doc.ref.delete();
		}
	}

	async delete(ids: string[]): Promise<void> {
		const batch = this.db.batch();
		for (const id of ids) {
			const docRef = this.db.doc(`AgentContext/${id}`);
			batch.delete(docRef);
		}
		// TODO delete LlmCalls and FunctionCache entries for the agent
		await batch.commit();
	}

	async updateFunctions(agentId: string, functions: string[]): Promise<void> {
		const agent = await this.load(agentId);
		if (!agent) {
			throw new Error('Agent not found');
		}

		agent.functions = new LlmFunctions();
		for (const functionName of functions) {
			const FunctionClass = functionFactory()[functionName];
			if (FunctionClass) {
				agent.functions.addFunctionClass(FunctionClass);
			} else {
				logger.warn(`Function ${functionName} not found in function factory`);
			}
		}

		await this.save(agent);
	}
}
