import { expect } from 'chai';
import sinon from 'sinon';
import { GitLab, getStartingLineNumber } from './gitlab';

describe('GitLab', () => {
	describe('diff', () => {
		it('should get the starting line number', async () => {
			expect(getStartingLineNumber(' @@ -0,0 +1,76 @@\n+async function()[]\n{')).to.equal(1);
			expect(getStartingLineNumber(' @@ -0,0 +152,76 @@\n+async function()[]\n{')).to.equal(152);
		});
	});

	// describe('getJobLogs', () => {
	// 	let gitLab: GitLab;
	// 	let apiStub: sinon.SinonStubbedInstance<Gitlab>;
	//
	// 	beforeEach(() => {
	// 		gitLabServer = new GitLabServer();
	// 		apiStub = sinon.createStubInstance(Gitlab);
	// 		gitLabServer.api = apiStub;
	// 	});
	//
	// 	it('should get the job logs', async () => {
	// 		const projectPath = 'some/project';
	// 		const jobId = 123;
	// 		const project = { id: 1 };
	// 		const job = { id: jobId };
	// 		const logs = 'Job logs content';
	//
	// 		apiStub.Projects.show.resolves(project);
	// 		apiStub.Jobs.show.resolves(job);
	// 		apiStub.Jobs.trace.resolves(logs);
	//
	// 		const result = await gitLab.getJobLogs(projectPath, jobId);
	// 		expect(result).to.equal(logs);
	// 	});
	// });
});
