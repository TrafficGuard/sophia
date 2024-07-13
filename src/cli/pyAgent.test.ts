import { expect } from 'chai';
import * as pyodide from 'pyodide';
import sinon from 'sinon';
import * as llmFunctions from '#agent/LlmFunctions';
import * as agentContext from '#agent/agentContext';
import * as pyodideAgentRunner from '#agent/pyodideAgentRunner';
import { FileSystem } from '#functions/filesystem';
import path from 'path';

describe('pyAgent', () => {
	let loadPyodideStub: sinon.SinonStub;
	let startAgentStub: sinon.SinonStub;
	let fileSystemStub: sinon.SinonStubbedInstance<FileSystem>;

	beforeEach(() => {
		loadPyodideStub = sinon.stub(pyodide, 'loadPyodide').resolves({
			globals: {
				set: sinon.stub(),
			},
			runPython: sinon.stub(),
		});
		startAgentStub = sinon.stub(pyodideAgentRunner, 'startAgent').resolves('agent-id');
		fileSystemStub = sinon.createStubInstance(FileSystem);
	});

	afterEach(() => {
		sinon.restore();
	});

	it('should initialize Pyodide and start the agent', async () => {
		process.argv = ['node', 'pyAgent.ts', 'Test', 'prompt'];
		await import('./pyAgent');
		
		expect(loadPyodideStub.calledOnce).to.be.true;
		expect(startAgentStub.calledOnce).to.be.true;
		expect(startAgentStub.firstCall.args[0]).to.deep.include({
			agentName: 'PyodideAgent',
			initialPrompt: 'Test prompt',
		});
	});

	it('should exit if no initial prompt is provided', async () => {
		process.argv = ['node', 'pyAgent.ts'];
		const consoleErrorStub = sinon.stub(console, 'error');
		const processExitStub = sinon.stub(process, 'exit');

		await import('./pyAgent');

		expect(consoleErrorStub.calledWith('Please provide an initial prompt.')).to.be.true;
		expect(processExitStub.calledWith(1)).to.be.true;
	});

	it('should load TypeScript files from the functions folder', async () => {
		process.argv = ['node', 'pyAgent.ts', 'Test', 'prompt'];
		const functionsPath = path.join(process.cwd(), 'src', 'functions');
		fileSystemStub.listFilesRecursively.resolves(['file1.ts', 'file2.ts', 'file3.js']);
		fileSystemStub.getFileContents.resolves('file contents');

		await import('./pyAgent');

		expect(fileSystemStub.listFilesRecursively.calledWith(functionsPath)).to.be.true;
		expect(fileSystemStub.getFileContents.callCount).to.equal(2); // Only for .ts files
		expect(loadPyodideStub.calledOnce).to.be.true;
	});
});
