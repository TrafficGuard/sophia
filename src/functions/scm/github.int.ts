import { expect } from 'chai';
import { GitHub } from './github';

/**
 * Tests that interact with real GitHub resources
 */
describe.only('GitHub Integration Tests', () => {
	let github: GitHub;

	beforeEach(() => {
		// Configured from the provided environment variables
		github = new GitHub();
	});

	afterEach(() => {});

	describe('getProjects and clone one', () => {
		it('should get the projects and clone the first one', async () => {});
	});
});
