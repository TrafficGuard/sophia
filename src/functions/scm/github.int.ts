import { expect } from 'chai';
import { existsSync } from 'fs';
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

	describe('getJobLogs', () => {
		it('should fetch job logs for a specific job', async () => {
			// Note: You'll need to replace these with actual values from your GitHub repository
			const projectPath = 'your-org/your-repo';
			const jobId = '12345678';

			const logs = await github.getJobLogs(projectPath, jobId);

			expect(logs).to.be.a('string');
			expect(logs.length).to.be.greaterThan(0);
			// You might want to add more specific assertions based on the expected content of the logs
		});

		it('should throw an error for non-existent job', async () => {
			const projectPath = 'your-org/your-repo';
			const nonExistentJobId = '99999999';

			try {
				await github.getJobLogs(projectPath, nonExistentJobId);
				expect.fail('Expected an error to be thrown');
			} catch (error) {
				expect(error).to.be.an('error');
				expect(error.message).to.include('Failed to get job logs');
			}
		});
	});
});
