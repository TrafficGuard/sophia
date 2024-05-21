import { AgentContext, AgentRunningState } from '#agent/agentContext';

export interface AgentStateService {
	save(state: AgentContext): Promise<void>;
	updateState(ctx: AgentContext, state: AgentRunningState): Promise<void>;
	load(agentId: string): Promise<AgentContext | null>;
	list(): Promise<AgentContext[]>;
	/**
	 * List agents which are not in a completed state
	 */
	listRunning(): Promise<AgentContext[]>;

	clear(): void;
}
