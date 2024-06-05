import { readFileSync } from 'fs';
import { expect } from 'chai';
import sinon from 'sinon';
import { appContext, initInMemoryApplicationContext } from 'src/app';
import { AGENT_COMPLETED_NAME, AGENT_REQUEST_FEEDBACK, REQUEST_FEEDBACK_PARAM_NAME } from '#agent/agentFunctions';
import {
	RunAgentConfig,
	SUPERVISOR_CANCELLED_FUNCTION_NAME,
	SUPERVISOR_RESUMED_FUNCTION_NAME,
	cancelAgent,
	provideFeedback,
	runAgent,
	startAgent,
} from '#agent/agentRunner';
import { Toolbox } from '#agent/toolbox';
import { TEST_FUNC_NOOP, TEST_FUNC_SUM, THROW_ERROR_TEXT, TestFunctions } from '#functions/testFunctions';
import { MockLLM } from '#llm/models/mock-llm';
import { User } from '#user/user';
import { sleep } from '#utils/async-utils';
import { AgentContext, AgentLLMs } from './agentContext';

const REQUEST_FEEDBACK_VALUE = 'question is...';
const REQUEST_FEEDBACK_FUNCTION_CALL = `<plan>Requesting feedback</plan>\n<function_calls><invoke><tool_name>${AGENT_REQUEST_FEEDBACK}</tool_name><parameters><${REQUEST_FEEDBACK_PARAM_NAME}>${REQUEST_FEEDBACK_VALUE}</${REQUEST_FEEDBACK_PARAM_NAME}></parameters></invoke></function_calls>`;
const COMPLETE_FUNCTION_CALL = `<plan>Ready to complete</plan>\n<function_calls><invoke><tool_name>${AGENT_COMPLETED_NAME}</tool_name><parameters></parameters></invoke></function_calls>`;
const NOOP_FUNCTION_CALL = `<plan>I'm going to call the noop function</plan>\n<function_calls><invoke><tool_name>${TEST_FUNC_NOOP}</tool_name><parameters></parameters></invoke></function_calls>`;

describe('agentRunner', () => {
	initInMemoryApplicationContext();
	let mockLLM = new MockLLM();
	let llms: AgentLLMs = {
		easy: mockLLM,
		medium: mockLLM,
		hard: mockLLM,
		xhard: mockLLM,
	};
	let toolbox = new Toolbox();

	function runConfig(runConfig?: Partial<RunAgentConfig>): RunAgentConfig {
		const defaults: RunAgentConfig = {
			agentName: 'test',
			initialPrompt: 'test prompt',
			systemPrompt: '<tools></tools>',
			llms,
			toolbox,
			user: createUser(),
		};
		return runConfig ? { ...defaults, ...runConfig } : defaults;
	}
	function createUser(user?: Partial<User>): User {
		const defaults: User = {
			email: '',
			enabled: true,
			hilBudget: 0,
			hilCount: 0,
			id: '',
			llmConfig: {},
			toolConfig: {},
		};
		return user ? { ...defaults, ...user } : defaults;
	}

	const agentSystemPrompt = readFileSync('src/cli/agent-system').toString();

	async function waitForAgent(): Promise<AgentContext> {
		while ((await appContext().agentStateService.list()).filter((agent) => agent.state === 'agent' || agent.state === 'functions').length > 0) {
			await sleep(1000);
		}
		const agents = await appContext().agentStateService.list();
		if (agents.length !== 1) {
			throw new Error('Expecting only one agent to exist');
		}
		return agents[0];
	}

	beforeEach(() => {
		initInMemoryApplicationContext();
		mockLLM = new MockLLM();
		llms = {
			easy: mockLLM,
			medium: mockLLM,
			hard: mockLLM,
			xhard: mockLLM,
		};
		toolbox = new Toolbox();
	});

	describe('test function calling', () => {
		it('should be able to call a function with multiple parameters', async () => {
			toolbox.addToolType(TestFunctions);
			mockLLM.addResponse(
				`<plan>call sum</plan><function_calls><invoke><tool_name>${TEST_FUNC_SUM}</tool_name><parameters><num1>3</num1><num2>6</num2></parameters></invoke></function_calls>`,
			);
			mockLLM.addResponse(COMPLETE_FUNCTION_CALL);
			await startAgent(runConfig({ initialPrompt: 'Add 3 and 6', toolbox }));
			const agent = await waitForAgent();
			// spy on sum
			expect(agent.error).to.be.undefined;
			expect(agent.state).to.equal('completed');
		});
	});

	describe('Agent.complete usage', () => {
		it('should be able to complete on the initial function call', async () => {
			toolbox.addToolType(TestFunctions);
			mockLLM.addResponse(COMPLETE_FUNCTION_CALL);
			await startAgent(runConfig({ toolbox }));
			const agent = await waitForAgent();
			expect(agent.error).to.be.undefined;
			expect(agent.state).to.equal('completed');
		});

		it('should be able to complete on the second function call', async () => {
			toolbox.addToolType(TestFunctions);
			mockLLM.addResponse(NOOP_FUNCTION_CALL);
			mockLLM.addResponse(COMPLETE_FUNCTION_CALL);
			await startAgent(runConfig({ toolbox }));
			const agent = await waitForAgent();
			expect(agent.error).to.be.undefined;
			expect(agent.state).to.equal('completed');
		});
	});

	describe('Agent.requestFeedback usage', () => {
		it('should be able to request feedback', async () => {
			mockLLM.addResponse(REQUEST_FEEDBACK_FUNCTION_CALL);
			await startAgent(runConfig({ toolbox }));
			const agent = await waitForAgent();
			expect(agent.functionCallHistory.length).to.equal(1);
			expect(agent.state).to.equal('feedback');

			mockLLM.addResponse(COMPLETE_FUNCTION_CALL);
			await provideFeedback(agent.agentId, agent.executionId, 'the feedback');

			expect(agent.state).to.equal('completed');
			expect(agent.functionCallHistory[0].stdout).to.equal('the feedback');
		});
	});

	describe('user/initial prompt handling', () => {
		it('the initial prompt should set on the agent after multiple function calls', async () => {
			toolbox.addToolType(TestFunctions);
			mockLLM.addResponse(NOOP_FUNCTION_CALL);
			mockLLM.addResponse(NOOP_FUNCTION_CALL);
			mockLLM.addResponse(COMPLETE_FUNCTION_CALL);
			const initialPrompt = 'Initial prompt test';
			await startAgent(runConfig({ initialPrompt, toolbox }));
			const agent = await waitForAgent();
			expect(agent.userPrompt).to.equal(initialPrompt);
		});

		it('should extract the user request when <user_request></user_request> exists in the prompt', async () => {
			toolbox.addToolType(TestFunctions);
			mockLLM.addResponse(NOOP_FUNCTION_CALL);
			mockLLM.addResponse(NOOP_FUNCTION_CALL);
			mockLLM.addResponse(COMPLETE_FUNCTION_CALL);
			const initialPrompt = 'Initial request test';
			await startAgent(runConfig({ initialPrompt: `<user_request>${initialPrompt}</user_request>`, toolbox }));
			const agent = await waitForAgent();
			expect(agent.userPrompt).to.equal(initialPrompt);
		});
	});

	describe('Function call throws an error', () => {
		it('should end the agent in the error state with the exception message in the error field', async () => {
			toolbox.addTool(new TestFunctions(), 'TestFunctions');

			const toolName = 'TestFunctions.throwError';
			const response = `<function_calls><invoke><tool_name>${toolName}</tool_name><parameters></parameters></invoke></function_calls>`;
			mockLLM.setResponse(response);

			const id = await startAgent(runConfig({ toolbox }));
			const ctx = await appContext().agentStateService.load(id);
			expect(ctx.state).to.equal('error');
			expect(ctx.error).to.include(THROW_ERROR_TEXT);
		});
	});

	describe('Resuming agent', () => {
		describe('Feedback provided', () => {
			it('should resume the agent with the feedback', async () => {
				mockLLM.addResponse(REQUEST_FEEDBACK_FUNCTION_CALL);
				const id = await startAgent(runConfig({ toolbox }));
				let agent = await waitForAgent();

				mockLLM.addResponse(COMPLETE_FUNCTION_CALL);
				await provideFeedback(agent.agentId, agent.executionId, 'the feedback');
				agent = await waitForAgent();
				expect(agent.state).to.equal('completed');
				const invoked = agent.functionCallHistory.find((call) => call.tool_name === AGENT_REQUEST_FEEDBACK);
				expect(invoked.stdout).to.equal('the feedback');
			});
		});
	});

	describe('Cancel errored agent', () => {
		it('should cancel the agent with note as output of the Supervisor.cancelled function call', async () => {
			toolbox.addToolType(TestFunctions);
			const toolName = 'TestFunctions.throwError';
			const response = `<function_calls><invoke><tool_name>${toolName}</tool_name><parameters></parameters></invoke></function_calls>`;
			mockLLM.setResponse(response);
			await startAgent(runConfig({ toolbox }));
			let agent = await waitForAgent();

			await cancelAgent(agent.agentId, agent.executionId, 'cancelled');
			agent = await waitForAgent();

			expect(agent.state).to.equal('completed');
			const invoked = agent.functionCallHistory.find((call) => call.tool_name === SUPERVISOR_CANCELLED_FUNCTION_NAME);
			expect(invoked.stdout).to.equal('cancelled');
		});
	});
});
