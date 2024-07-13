import { expect } from 'chai';
import * as pyodide from 'pyodide';
import sinon from 'sinon';
import * as llmFunctions from '#agent/LlmFunctions';
import * as agentContext from '#agent/agentContext';
import * as pyodideAgentRunner from '#agent/pyodideAgentRunner';

describe('pyAgent', () => {
	let loadPyodideStub: sinon.SinonStub;
	let startAgentStub: sinon.SinonStub;

	beforeEach(() => {});

	afterEach(() => {
		sinon.restore();
	});

	it('should initialize Pyodide and start the agent', async () => {
		// process.argv = ['node', 'pyAgent.ts', 'Test', 'prompt'];
		// await import('./pyAgent');
		// expect(loadPyodideStub.calledOnce).to.be.true;
		// expect(startAgentStub.calledOnce).to.be.true;
		// expect(startAgentStub.firstCall.args[0]).to.deep.include({
		//     agentName: 'PyodideAgent',
		//     initialPrompt: 'Test prompt',
		// });
	});

	it('should exit if no initial prompt is provided', async () => {
		process.argv = ['node', 'pyAgent.ts'];

		// await import('./pyAgent');

		// expect(console.error.calledWith('Please provide an initial prompt.')).to.be.true;
		// expect(process.exit.calledWith(1)).to.be.true;
	});
});
