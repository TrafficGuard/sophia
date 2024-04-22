import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { AgentContext, AgentRunningState, agentContextStorage, deserializeContext, serializeContext } from '#agent/agentContext';

export interface AgentStateService {
	save(state: AgentContext): Promise<void>;
	updateState(ctx: AgentContext, state: AgentRunningState): Promise<void>;
	load(executionId: string): Promise<AgentContext | null>;
	listRunning(): Promise<AgentContext[]>;
}

export class AgentStateServiceFile implements AgentStateService {
	async save(state: AgentContext): Promise<void> {
		mkdirSync('./.nous/agent-state', { recursive: true });
		writeFileSync(`./.nous/agent-state/${state.agentId}.json`, JSON.stringify(serializeContext(state)));
	}
	async updateState(ctx: AgentContext, state: AgentRunningState): Promise<void> {
		ctx.state = state;
		await this.save(ctx);
	}
	async load(executionId: string): Promise<AgentContext> {
		const jsonString = readFileSync(`./.nous/agent-state/${executionId}.json`).toString();
		return deserializeContext(JSON.parse(jsonString));
	}

	async listRunning(): Promise<AgentContext[]> {
		// list files under './.nous/agent-state'
		const contexts: AgentContext[] = [];
		console.log('readdirSync');
		const files = readdirSync('./.nous/agent-state');
		for (const file of files) {
			if (file.endsWith('.json')) {
				console.log(`readFileSync ./.nous/agent-state/${file}`);
				const jsonString = readFileSync(`./.nous/agent-state/${file}`).toString();
				try {
					const ctx = deserializeContext(JSON.parse(jsonString));
					if (ctx.state !== 'completed') contexts.push(ctx);
				} catch (e) {
					console.log('Unable to deserialise', file, e.message);
				}
			}
		}

		return contexts;
	}
}

export class AgentStateServiceInMemory implements AgentStateService {
	stateMap: Map<string, AgentContext> = new Map();

	async save(state: AgentContext): Promise<void> {
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

	listRunning(): Promise<AgentContext[]> {
		const running = Array.of(...this.stateMap.values()).filter((ctx) => ctx.state !== 'completed');
		return Promise.resolve(running);
	}
}

// https://orm.drizzle.team/docs/column-types/pg
// export class DrizzleAgentStateService implements AgentStateService {
// 	updateState(ctx: AgentContext, state: AgentRunningState): Promise<void> {
// 		ctx.state = state;
// 		return this.save(ctx);
// 	}
// 	// ... (Database connection and query logic using a Postgres library)
//
// 	async save(state: AgentContext): Promise<void> {
// 		// Serialize state properties as needed
// 		const serializedState = {
// 			// ...
// 		};
//
// 		// Perform INSERT or UPDATE query based on executionId
// 	}
//
// 	async load(executionId: string): Promise<AgentContext | null> {
// 		// Perform SELECT query based on executionId
// 		// Deserialize loaded data into AgentContext object
// 		return null;
// 	}
// }
