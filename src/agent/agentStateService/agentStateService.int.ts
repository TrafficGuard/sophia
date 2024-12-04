import { expect } from 'chai';
import { AgentContext } from '#agent/agentContextTypes';
import { AgentStateService } from '#agent/agentStateService/agentStateService';
import { resetFirestoreEmulator } from '#firestore/resetFirestoreEmulator';
import { mockLLMs } from '#llm/services/mock-llm';
import { FirestoreAgentStateService } from '#modules/firestore/firestoreAgentStateService';

describe.skip('AgentStateService Integration Tests', () => {
	let service: AgentStateService;

	beforeEach(async () => {
		service = new FirestoreAgentStateService();
	});

	afterEach(async () => {
		try {
			await resetFirestoreEmulator();
		} catch (e) {}
	});

	describe('child agents', async () => {
		it('when a child agent is created it should be added to the parent agent childAgentIds property', async () => {
			const parentAgent: AgentContext = {
				agentId: 'parent1',
				name: 'Parent Agent',
				user: { id: 'user' },
				llms: mockLLMs(),
				childAgents: [],
			} as AgentContext;

			const childAgent: AgentContext = {
				agentId: 'child1',
				user: { id: 'user' },
				name: 'Child Agent',
				parentAgentId: 'parent1',
				llms: mockLLMs(),
			} as AgentContext;

			// Save parent first
			await service.save(parentAgent);

			// Save child agent
			await service.save(childAgent);

			// Load parent agent and verify child was added
			const updatedParent = await service.load(parentAgent.agentId);
			expect(updatedParent).to.not.be.null;
			expect(updatedParent.childAgents).to.include(childAgent.agentId);

			// Verify child agent was saved correctly
			const loadedChild = await service.load(childAgent.agentId);
			expect(loadedChild).to.not.be.null;
			expect(loadedChild.parentAgentId).to.equal(parentAgent.agentId);

			// Cleanup
			await service.delete(['parent1', 'child1']);
		});

		it('should handle non-existent parent agent gracefully', async () => {
			const orphanAgent: AgentContext = {
				agentId: 'orphan1',
				user: { id: 'user' },
				name: 'Orphan Agent',
				parentAgentId: 'nonexistent',
				llms: mockLLMs(),
			} as AgentContext;

			try {
				await service.save(orphanAgent);
				expect.fail('Should throw error for non-existent parent');
			} catch (error) {
				expect(error.message).to.include('Parent agent nonexistent not found');
			}
		});

		it('should handle concurrent child agent creation correctly', async () => {
			const parent: AgentContext = {
				agentId: 'concurrent-parent',
				user: { id: 'user' },
				name: 'Concurrent Parent',
				childAgents: [],
				llms: mockLLMs(),
			} as AgentContext;
			await service.save(parent);

			const childAgents: AgentContext[] = [];
			for (let i = 1; i <= 10; i++) {
				childAgents.push({
					agentId: `concurrent-child${i}`,
					user: { id: 'user' },
					name: `Concurrent Child ${i}`,
					parentAgentId: 'concurrent-parent',
					llms: mockLLMs(),
				} as AgentContext);
			}

			// Save children concurrently
			await Promise.all(childAgents.map((child) => service.save(child)));

			// Verify all children were added to parent
			const updatedParent = await service.load(parent.agentId);
			childAgents.forEach((child) => {
				expect(updatedParent.childAgents).to.include(child.agentId);
			});
			// Cleanup
			await service.delete(['concurrent-parent', ...childAgents.map((child) => child.agentId)]);
		});
	});

	it('should delete specified agents', async () => {
		const testAgents: AgentContext[] = [{ agentId: 'test1', name: 'Test Agent 1' } as AgentContext, { agentId: 'test2', name: 'Test Agent 2' } as AgentContext];
		for (const agent of testAgents) {
			await service.save(agent);
		}

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
