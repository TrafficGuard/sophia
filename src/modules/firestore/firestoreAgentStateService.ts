import { DocumentSnapshot, Firestore } from '@google-cloud/firestore';
import { LlmFunctions } from '#agent/LlmFunctions';
import { AgentContext, AgentRunningState, isExecuting } from '#agent/agentContextTypes';
import { deserializeAgentContext, serializeContext } from '#agent/agentSerialization';
import { AgentStateService } from '#agent/agentStateService/agentStateService';
import { functionFactory } from '#functionSchema/functionDecorators';
import { logger } from '#o11y/logger';
import { span } from '#o11y/trace';
import { currentUser } from '#user/userService/userContext';
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

		if (state.parentAgentId) {
			await this.db.runTransaction(async (transaction) => {
				// Get the parent agent
				const parentDocRef = this.db.doc(`AgentContext/${state.parentAgentId}`);
				const parentDoc = await transaction.get(parentDocRef);

				if (!parentDoc.exists) {
					throw new Error(`Parent agent ${state.parentAgentId} not found`);
				}

				const parentData = parentDoc.data();
				const childAgents = new Set(parentData.childAgents || []);

				// Add child to parent if not already present
				if (!childAgents.has(state.agentId)) {
					childAgents.add(state.agentId);
					transaction.update(parentDocRef, {
						childAgents: Array.from(childAgents),
						lastUpdate: Date.now(),
					});
				}

				// Save the child agent state
				transaction.set(docRef, serialized);
			});
		} else {
			try {
				await docRef.set(serialized);
			} catch (error) {
				logger.error(error, 'Error saving agent state');
				throw error;
			}
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
			.where('user', '==', currentUser().id)
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

	@span()
	async delete(ids: string[]): Promise<void> {
		// First load all agents to handle parent-child relationships
		let agents = await Promise.all(
			ids.map(async (id) => {
				try {
					return await this.load(id); // only need to load the childAgents property
				} catch (error) {
					logger.error(error, `Error loading agent ${id} for deletion`);
					return null;
				}
			}),
		);

		const user = currentUser();

		agents = agents
			.filter((agent) => !!agent) // Filter out non-existent ids
			.filter((agent) => agent.user.id === user.id) // Can only delete your own agents
			.filter((agent) => !isExecuting(agent)) // Can only delete executing agents
			.filter((agent) => !agent.parentAgentId); // Only delete parent agents. Child agents are deleted with the parent agent.

		// Now delete the agents
		const deleteBatch = this.db.batch();
		for (const agent of agents) {
			for (const childId of agent.childAgents ?? []) {
				deleteBatch.delete(this.db.doc(`AgentContext/${childId}`));
			}
			// TODO will need to handle if child agents have child agents
			const docRef = this.db.doc(`AgentContext/${agent.agentId}`);
			deleteBatch.delete(docRef);
		}

		await deleteBatch.commit();
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
