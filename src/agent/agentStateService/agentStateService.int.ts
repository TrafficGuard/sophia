import fs from 'fs';
import { expect } from 'chai';
import { AgentContext } from '#agent/agentContextTypes';
import { AgentStateService } from '#agent/agentStateService/agentStateService';
import { FirestoreAgentStateService } from '#modules/firestore/firestoreAgentStateService';

describe('AgentStateService Integration Tests', () => {
	let service: AgentStateService;
	const testAgents: AgentContext[] = [{ agentId: 'test1', name: 'Test Agent 1' } as AgentContext, { agentId: 'test2', name: 'Test Agent 2' } as AgentContext];

	beforeEach(async () => {
		service = new FirestoreAgentStateService();
		for (const agent of testAgents) {
			await service.save(agent);
		}
	});

	afterEach(() => {
		try {
			service.delete(['test1', 'test2']);
		} catch (e) {}
	});

	it('should delete specified agents', async () => {
		// Verify agents exist
		let agents = await service.list();
		expect(agents.length).to.equal(2);

		// Delete one agent
		await service.delete(['test1']);

		// Verify only one agent remains
		agents = await service.list();
		expect(agents.length).to.equal(1);
		expect(agents[0].agentId).to.equal('test2');

		// Delete the remaining agent
		await service.delete(['test2']);

		// Verify no agents remain
		agents = await service.list();
		expect(agents.length).to.equal(0);
	});

	it('should handle deleting non-existent agents', async () => {
		// Attempt to delete a non-existent agent
		await service.delete(['nonexistent']);

		// Verify existing agents are unaffected
		const agents = await service.list();
		expect(agents.length).to.equal(2);
	});
});
