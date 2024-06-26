import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { unlinkSync } from 'node:fs';
import { AgentContext, AgentRunningState, deserializeAgentContext, serializeContext } from '#agent/agentContext';
import { AgentStateService } from '#agent/agentStateService/agentStateService';
import { logger } from '#o11y/logger';

export class FileAgentStateService implements AgentStateService {
	async save(state: AgentContext): Promise<void> {
		state.lastUpdate = Date.now();
		mkdirSync('./.nous/agents', { recursive: true });
		writeFileSync(`./.nous/agents/${state.agentId}.json`, JSON.stringify(serializeContext(state)));
	}
	async updateState(ctx: AgentContext, state: AgentRunningState): Promise<void> {
		ctx.state = state;
		await this.save(ctx);
	}
	async load(agentId: string): Promise<AgentContext> {
		const jsonString = readFileSync(`./.nous/agents/${agentId}.json`).toString();
		return await deserializeAgentContext(JSON.parse(jsonString));
	}

	async list(): Promise<AgentContext[]> {
		const contexts: AgentContext[] = [];
		const files = readdirSync('./.nous/agents');
		for (const file of files) {
			if (file.endsWith('.json')) {
				const jsonString = readFileSync(`./.nous/agents/${file}`).toString();
				try {
					const ctx: AgentContext = await deserializeAgentContext(JSON.parse(jsonString));
					contexts.push(ctx);
				} catch (e) {
					logger.warn('Unable to deserialize %o %s', file, e.message);
				}
			}
		}

		return contexts;
	}

	async listRunning(): Promise<AgentContext[]> {
		return (await this.list()).filter((agent) => agent.state !== 'completed');
	}

	clear(): void {}

	async delete(ids: string[]): Promise<void> {
		for (const id of ids) {
			try {
				const filePath = `./.nous/agents/${id}.json`;
				unlinkSync(filePath);
			} catch (error) {
				logger.warn(`Failed to delete agent ${id}: ${error.message}`);
			}
		}
	}
}
