import { readFileSync } from 'fs';
import { expect } from 'chai';
import sinon from 'sinon';
import { appCtx, setApplicationContext } from 'src/app';
import { runAgent } from '#agent/agentRunner';
import { Toolbox } from '#agent/toolbox';
import { THROW_ERROR_TEXT, TestFunctions } from '#functions/testFunctions';
import { FunctionResponse, Invoke } from '#llm/llm';
import { MockLLM } from '#llm/models/mock-llm';
import { FakeUserService } from '#services/user/fakeUserService';
import { AgentLLMs } from './agentContext';
import { AgentStateServiceInMemory } from './agentStateService';

describe('agentRunner', () => {
	setApplicationContext({ agentStateService: new AgentStateServiceInMemory(), userService: new FakeUserService() });
	const mockLLM = new MockLLM();
	const llms: AgentLLMs = {
		easy: mockLLM,
		medium: mockLLM,
		hard: mockLLM,
		xhard: mockLLM,
	};

	const agentSystemPrompt = readFileSync('src/test/agent-system').toString();
	describe('test function calling', () => {
		it('should be able to call a function with multiple parameters', async () => {
			const toolbox = new Toolbox();
			toolbox.addTool(new TestFunctions(), 'TestFunctions');
			// const result = await runAgent('testAgent', toolbox, 'What is the sum of 3 and 11?', agentSystemPrompt);
			// expect(end - start).to.be.gte(100); // Chai equivalent of Jest's greaterThanOrEqual
		});
	});

	describe('function call throws an error', () => {
		it('should end the agent in the error state with the exectption message in the error field', async () => {
			const toolbox = new Toolbox();
			toolbox.addTool(new TestFunctions(), 'TestFunctions');

			const toolName = 'TestFunctions.throwError';
			const invoke: Invoke = {
				tool_name: 'TestFunctions.throwError',
				parameters: [],
			};
			const functionResponse: FunctionResponse = {
				response: '',
				functions: {
					invoke: [invoke],
				},
			};
			const response = `<function_calls><invoke><tool_name>${toolName}</tool_name><parameters></parameters></invoke></function_calls>`;
			mockLLM.setResponse(response);

			const id = await runAgent({
				agentName: 'test',
				initialPrompt: '',
				systemPrompt: '<tools></tools>',
				toolbox,
				llms,
			});
			const ctx = await appCtx().agentStateService.load(id);
			expect(ctx.state).to.equal('error');
			expect(ctx.error).to.include(THROW_ERROR_TEXT);
		});
	});
});
