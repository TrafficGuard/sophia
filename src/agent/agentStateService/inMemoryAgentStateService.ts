import { AgentContext, AgentRunningState } from '#agent/agentContext';
import { AgentStateService } from '#agent/agentStateService/agentStateService';

/**
 * In-memory implementation of AgentStateService for tests
 */
export class InMemoryAgentStateService implements AgentStateService {
	stateMap: Map<string, AgentContext> = new Map();

	clear(): void {
		this.stateMap.clear();
	}

	async save(state: AgentContext): Promise<void> {
		state.lastUpdate = Date.now();
		this.stateMap.set(state.agentId, state);
	}

	async updateState(ctx: AgentContext, state: AgentRunningState): Promise<void> {
		ctx.state = state;
		await this.save(ctx);
	}

	async load(executionId: string): Promise<AgentContext> {
		if (!this.stateMap.has(executionId)) throw new Error('Agent state not found');
		return this.stateMap.get(executionId);
	}

	list(): Promise<AgentContext[]> {
		const running = Array.of(...this.stateMap.values());
		return Promise.resolve(running);
	}

	async listRunning(): Promise<AgentContext[]> {
		return (await this.list()).filter((agent) => agent.state !== 'completed');
	}

	async delete(ids: string[]): Promise<void> {
		for (const id of ids) this.stateMap.delete(id);
	}
}
