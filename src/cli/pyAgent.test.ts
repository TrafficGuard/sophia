import { expect } from 'chai';
import sinon from 'sinon';
import * as pyodide from 'pyodide';
import * as pyodideAgentRunner from '#agent/pyodideAgentRunner';
import * as llmFunctions from '#agent/LlmFunctions';
import * as agentContext from '#agent/agentContext';

describe('pyAgent', () => {
    let loadPyodideStub: sinon.SinonStub;
    let startAgentStub: sinon.SinonStub;

    beforeEach(() => {
        loadPyodideStub = sinon.stub(pyodide, 'loadPyodide').resolves({
            loadPackage: sinon.stub().resolves(),
            pyimport: sinon.stub().returns({
                install: sinon.stub().resolves(),
            }),
        });
        startAgentStub = sinon.stub(pyodideAgentRunner, 'startAgent').resolves('test-agent-id');
        sinon.stub(agentContext, 'llms').returns({});
        sinon.stub(console, 'log');
        sinon.stub(console, 'error');
        sinon.stub(process, 'exit');
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
        
        await import('./pyAgent');

        expect(console.error.calledWith('Please provide an initial prompt.')).to.be.true;
        expect(process.exit.calledWith(1)).to.be.true;
    });
});
