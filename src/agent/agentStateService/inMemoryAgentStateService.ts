import { AgentContext, AgentRunningState, deserializeAgentContext, serializeContext } from '#agent/agentContext';
import { AgentStateService } from '#agent/agentStateService/agentStateService';

/**
 * In-memory implementation of AgentStateService for tests. Serializes/deserializes
 * to behave the same as the FireStore implementation
 */
export class InMemoryAgentStateService implements AgentStateService {
	stateMap: Map<string, Record<string, any>> = new Map();

	clear(): void {
		this.stateMap.clear();
	}

	async save(state: AgentContext): Promise<void> {
		state.lastUpdate = Date.now();
		const serialized = serializeContext(state);
		this.stateMap.set(state.agentId, serialized);
	}

	async updateState(ctx: AgentContext, state: AgentRunningState): Promise<void> {
		ctx.state = state;
		await this.save(ctx);
	}

	async load(executionId: string): Promise<AgentContext> {
		if (!this.stateMap.has(executionId)) throw new Error('Agent state not found');
		const serialized = this.stateMap.get(executionId);
		return await deserializeAgentContext(serialized);
	}

	async list(): Promise<AgentContext[]> {
		const serializedList = Array.from(this.stateMap.values());
		return Promise.all(serializedList.map(deserializeAgentContext));
	}

	async listRunning(): Promise<AgentContext[]> {
		const allAgents = await this.list();
		return allAgents.filter((agent) => agent.state !== 'completed');
	}

	async delete(ids: string[]): Promise<void> {
		for (const id of ids) this.stateMap.delete(id);
	}
}
