import { AgentContext, AgentRunningState, agentContext } from '#agent/agentContext';

export interface AgentStateService {
	save(state: AgentContext): Promise<void>;
	updateState(ctx: AgentContext, state: AgentRunningState): Promise<void>;
	load(executionId: string): Promise<AgentContext | null>;
}

// https://orm.drizzle.team/docs/column-types/pg
export class DrizzleAgentStateService implements AgentStateService {
	updateState(ctx: AgentContext, state: AgentRunningState): Promise<void> {
		ctx.state = state;
		return this.save(ctx);
	}
	// ... (Database connection and query logic using a Postgres library)

	async save(state: AgentContext): Promise<void> {
		// Serialize state properties as needed
		const serializedState = {
			// ...
		};

		// Perform INSERT or UPDATE query based on executionId
	}

	async load(executionId: string): Promise<AgentContext | null> {
		// Perform SELECT query based on executionId
		// Deserialize loaded data into AgentContext object
		return null;
	}
}
