import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { unlinkSync } from 'node:fs';
import { LlmFunctions } from '#agent/LlmFunctions';
import { AgentContext, AgentRunningState } from '#agent/agentContextTypes';
import { deserializeAgentContext, serializeContext } from '#agent/agentSerialization';
import { AgentStateService } from '#agent/agentStateService/agentStateService';
import { functionFactory } from '#functionSchema/functionDecorators';
import { logger } from '#o11y/logger';
import { systemDir } from '../../appVars';

const BASE_DIR = '.sophia';

export class FileAgentStateService implements AgentStateService {
	async save(state: AgentContext): Promise<void> {
		state.lastUpdate = Date.now();
		mkdirSync(`${systemDir()}/agents`, { recursive: true });
		writeFileSync(`${systemDir()}/agents/${state.agentId}.json`, JSON.stringify(serializeContext(state)));
	}
	async updateState(ctx: AgentContext, state: AgentRunningState): Promise<void> {
		ctx.state = state;
		await this.save(ctx);
	}
	async load(agentId: string): Promise<AgentContext> {
		const jsonString = readFileSync(`${systemDir()}/agents/${agentId}.json`).toString();
		return await deserializeAgentContext(JSON.parse(jsonString));
	}

	async list(): Promise<AgentContext[]> {
		const contexts: AgentContext[] = [];
		const files = readdirSync(`${systemDir()}/agents`);
		for (const file of files) {
			if (file.endsWith('.json')) {
				const jsonString = readFileSync(`${systemDir()}/agents/${file}`).toString();
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
				const filePath = `${systemDir()}/agents/${id}.json`;
				unlinkSync(filePath);
			} catch (error) {
				logger.warn(`Failed to delete agent ${id}: ${error.message}`);
			}
		}
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
