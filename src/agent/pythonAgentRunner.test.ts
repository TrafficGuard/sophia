import { expect } from 'chai';
import sinon from 'sinon';
import { appContext, initInMemoryApplicationContext } from 'src/app';
import { LlmFunctions } from '#agent/LlmFunctions';
import { AGENT_COMPLETED_NAME, AGENT_REQUEST_FEEDBACK, AGENT_SAVE_MEMORY, REQUEST_FEEDBACK_PARAM_NAME } from '#agent/agentFunctions';
import {
	RunAgentConfig,
	SUPERVISOR_CANCELLED_FUNCTION_NAME,
	SUPERVISOR_RESUMED_FUNCTION_NAME,
	cancelAgent,
	provideFeedback,
	startAgent,
	startAgentAndWait,
} from '#agent/agentRunner';
import { PY_AGENT_SPAN, convertTypeScriptToPython } from '#agent/pythonAgentRunner';
import { TEST_FUNC_NOOP, TEST_FUNC_SKY_COLOUR, TEST_FUNC_SUM, TEST_FUNC_THROW_ERROR, THROW_ERROR_TEXT, TestFunctions } from '#functions/testFunctions';
import { MockLLM, mockLLM, mockLLMs } from '#llm/models/mock-llm';
import { logger } from '#o11y/logger';
import { setTracer } from '#o11y/trace';
import { User } from '#user/user';
import { sleep } from '#utils/async-utils';
import { AgentContext, AgentLLMs, agentContextStorage } from './agentContext';

const PY_AGENT_COMPLETED = (note: string) => `await ${AGENT_COMPLETED_NAME}("${note}")`;
const PY_AGENT_REQUEST_FEEDBACK = (feedback: string) => `await ${AGENT_REQUEST_FEEDBACK}("${feedback}")`;

const PY_TEST_FUNC_NOOP = `await ${TEST_FUNC_NOOP}()`;
const PY_TEST_FUNC_SKY_COLOUR = `await ${TEST_FUNC_SKY_COLOUR}()`;
const PY_TEST_FUNC_SUM = (num1, num2) => `await ${TEST_FUNC_SUM}(${num1}, ${num2})`;
const PY_TEST_FUNC_THROW_ERROR = `await ${TEST_FUNC_THROW_ERROR}()`;
const PY_SET_MEMORY = (key, content) => `await ${AGENT_SAVE_MEMORY}("${key}", "${content}")`;

const PYTHON_CODE_PLAN = (pythonCode: string) => `<response>\n<plan>Run some code</plan>\n<python-code>${pythonCode}</python-code>\n</response>`;
const REQUEST_FEEDBACK_FUNCTION_CALL_PLAN = (feedback) =>
	`<response>\n<plan>Requesting feedback</plan>\n<python-code>${PY_AGENT_REQUEST_FEEDBACK(feedback)}</python-code>\n</response>`;
const COMPLETE_FUNCTION_CALL_PLAN = `<response>\n<plan>Ready to complete</plan>\n<python-code>${PY_AGENT_COMPLETED('done')}</python-code>\n</response>`;
const NOOP_FUNCTION_CALL_PLAN = `<response>\n<plan>I'm going to call the noop function</plan>\n<python-code>${PY_TEST_FUNC_NOOP}</python-code>\n</response>`;
const SKY_COLOUR_FUNCTION_CALL_PLAN = `<response>\n<plan>Get the sky colour</plan>\n<python-code>${PY_TEST_FUNC_SKY_COLOUR}</python-code>\n</response>`;

describe('pythonAgentRunner', () => {
	const ctx = initInMemoryApplicationContext();

	let functions = new LlmFunctions();
	const AGENT_NAME = 'test';

	function runConfig(runConfig?: Partial<RunAgentConfig>): RunAgentConfig {
		const defaults: RunAgentConfig = {
			agentName: AGENT_NAME,
			initialPrompt: 'test prompt',
			systemPrompt: '<functions></functions>',
			type: 'python',
			llms: mockLLMs(),
			functions,
			user: ctx.userService.getSingleUser(),
		};
		return runConfig ? { ...defaults, ...runConfig } : defaults;
	}
	// function createUser(user?: Partial<User>): User {
	// 	const defaults: User = {
	// 		email: '',
	// 		enabled: true,
	// 		hilBudget: 0,
	// 		hilCount: 0,
	// 		id: '',
	// 		llmConfig: {},
	// 		functionConfig: {},
	// 	};
	// 	return user ? { ...defaults, ...user } : defaults;
	// }

	async function waitForAgent(): Promise<AgentContext> {
		while ((await appContext().agentStateService.list()).filter((agent) => agent.state === 'agent' || agent.state === 'functions').length > 0) {
			await sleep(10);
		}
		const agents = await appContext().agentStateService.list();
		if (agents.length !== 1) {
			throw new Error('Expecting only one agent to exist');
		}
		return agents[0];
	}

	beforeEach(() => {
		initInMemoryApplicationContext();
		// This is needed for the tests on the LlmCall.callStack property
		setTracer(null, agentContextStorage);
		mockLLM.reset();
		functions = new LlmFunctions();
	});

	afterEach(() => {
		logger.flush();
	});

	describe('test function calling', () => {
		it('should be able to call a function with multiple parameters', async () => {
			functions.addFunctionClass(TestFunctions);
			let initialPrompt: string;
			let secondPrompt: string;
			let finalPrompt: string;
			mockLLM.addResponse(
				`<response>\n<plan>call sum 3 6</plan>\n<python-code>${PY_SET_MEMORY('memKey', 'contents')}\nreturn ${PY_TEST_FUNC_SUM(
					3,
					6,
				)}</python-code>\n</response>`,
				(p) => {
					initialPrompt = p;
				},
			);
			mockLLM.addResponse(`<response>\n<plan>call sum 42 42</plan>\n<python-code>return ${PY_TEST_FUNC_SUM(42, 42)}</python-code>\n</response>`, (p) => {
				secondPrompt = p;
			});
			mockLLM.addResponse(COMPLETE_FUNCTION_CALL_PLAN, (p) => {
				finalPrompt = p;
			});
			await startAgent(runConfig({ initialPrompt: 'Task is to 3 and 6', functions: functions }));
			const agent = await waitForAgent();
			// spy on sum
			expect(agent.state).to.equal('completed');

			// when the second round of the control loop happens the prompt should be
			// <old-function-call-history>
			//<memory>
			// <tool-state>
			// <
			await sleep(100);
			console.log();
			console.log('Initial ===================================');
			console.log(initialPrompt);
			console.log();
			console.log('Second ===================================');
			console.log(secondPrompt);
			console.log();
			console.log('Final ===================================');
			console.log(finalPrompt);
		});
	});

	describe('Agent.complete usage', () => {
		it('should be able to complete on the initial function call', async () => {
			functions.addFunctionClass(TestFunctions);
			mockLLM.addResponse(COMPLETE_FUNCTION_CALL_PLAN);
			await startAgent(runConfig({ functions }));
			const agent = await waitForAgent();
			expect(agent.error).to.be.undefined;
			expect(agent.state).to.equal('completed');
		});

		it('should be able to complete on the second function call', async () => {
			functions.addFunctionClass(TestFunctions);
			mockLLM.addResponse(NOOP_FUNCTION_CALL_PLAN);
			mockLLM.addResponse(COMPLETE_FUNCTION_CALL_PLAN);
			await startAgent(runConfig({ functions }));
			const agent = await waitForAgent();
			expect(!agent.error).to.be.true;
			expect(agent.state).to.equal('completed');
		});
	});

	describe('Agent.requestFeedback usage', () => {
		it('should be able to request feedback', async () => {
			const feedbackNote = 'the feedback XYZ';
			mockLLM.addResponse(REQUEST_FEEDBACK_FUNCTION_CALL_PLAN(feedbackNote));
			await startAgent(runConfig({ functions }));
			let agent = await waitForAgent();
			expect(agent.functionCallHistory.length).to.equal(1);
			expect(agent.state).to.equal('feedback');

			let postFeedbackPrompt: string;
			(agent.llms.hard as MockLLM).addResponse(COMPLETE_FUNCTION_CALL_PLAN, (prompt) => {
				postFeedbackPrompt = prompt;
			});
			logger.info('Providing feedback...');
			await provideFeedback(agent.agentId, agent.executionId, feedbackNote);
			agent = await waitForAgent();

			// Make sure the agent can see the feedback note
			// TODO check that the note is after the <python-code> block
			// in the function call results.
			// Should have all the calls from that iterations in the results not the history
			expect(postFeedbackPrompt).to.not.be.undefined;
			expect(postFeedbackPrompt).to.include(feedbackNote);
			expect(agent.state).to.equal('completed');
			expect(agent.functionCallHistory[0].stdout).to.equal(feedbackNote);
		});
	});

	describe('user/initial prompt handling', () => {
		it('the initial prompt should set on the agent after multiple function calls', async () => {
			functions.addFunctionClass(TestFunctions);
			mockLLM.addResponse(NOOP_FUNCTION_CALL_PLAN);
			mockLLM.addResponse(NOOP_FUNCTION_CALL_PLAN);
			mockLLM.addResponse(COMPLETE_FUNCTION_CALL_PLAN);
			const initialPrompt = 'Initial prompt test';
			await startAgent(runConfig({ initialPrompt, functions: functions }));
			const agent = await waitForAgent();
			expect(agent.userPrompt).to.equal(initialPrompt);
		});

		it('should extract the user request when <user_request></user_request> exists in the prompt', async () => {
			functions.addFunctionClass(TestFunctions);
			mockLLM.addResponse(NOOP_FUNCTION_CALL_PLAN);
			mockLLM.addResponse(NOOP_FUNCTION_CALL_PLAN);
			mockLLM.addResponse(COMPLETE_FUNCTION_CALL_PLAN);
			const initialPrompt = 'Initial request test';
			await startAgent(runConfig({ initialPrompt: `<user_request>${initialPrompt}</user_request>`, functions: functions }));
			const agent = await waitForAgent();
			expect(agent.userPrompt).to.equal(initialPrompt);
		});
	});

	describe('If theres an indentation error then it should retry', () => {
		it('If theres an indentation error then it should retry', async () => {
			functions.addFunctionClass(TestFunctions);
			// Add extra indentation
			mockLLM.addResponse(PYTHON_CODE_PLAN(`  ${PY_AGENT_COMPLETED('done')}`));
			// Add the fixed code
			mockLLM.addResponse(COMPLETE_FUNCTION_CALL_PLAN);
			await startAgent(runConfig({ functions }));
			const agent = await waitForAgent();
			expect(agent.error).to.be.undefined;
			expect(agent.state).to.equal('completed');
		});
	});

	describe('Function call throws an error', () => {
		it('should continue on if a function throws an error', async () => {
			functions.addFunctionInstance(new TestFunctions(), 'TestFunctions');

			const response = `<response><plan>error</plan><python-code>${PY_TEST_FUNC_THROW_ERROR}</python-code></response>`;
			mockLLM.setResponse(response);

			let nextPrompt: string;
			mockLLM.addResponse(COMPLETE_FUNCTION_CALL_PLAN, (prompt) => {
				nextPrompt = prompt;
			});

			const id = await startAgentAndWait(runConfig({ functions }));
			const ctx = await appContext().agentStateService.load(id);

			console.log(`Next prompt ===============\n${nextPrompt}`);

			expect(ctx.state).to.equal('completed');
			// expect(ctx.state).to.equal('error');
			// expect(ctx.error).to.include(THROW_ERROR_TEXT);
		});
	});

	describe('Resuming agent', () => {
		describe('Feedback provided', () => {
			it('should resume the agent with the feedback', async () => {
				const feedbackNote = 'the feedback';
				mockLLM.addResponse(REQUEST_FEEDBACK_FUNCTION_CALL_PLAN(feedbackNote));
				const id = await startAgent(runConfig({ functions }));
				let agent = await waitForAgent();

				mockLLM.addResponse(COMPLETE_FUNCTION_CALL_PLAN);
				await provideFeedback(agent.agentId, agent.executionId, feedbackNote);
				agent = await waitForAgent();

				expect(agent.state).to.equal('completed');
				const functionCallResult = agent.functionCallHistory.find((call) => call.function_name === AGENT_REQUEST_FEEDBACK);
				expect(functionCallResult.stdout).to.equal(feedbackNote);
			});
		});
	});

	describe('Cancel errored agent', () => {
		it('should cancel the agent with note as output of the Supervisor.cancelled function call', async () => {
			functions.addFunctionClass(TestFunctions);
			const functionName = 'TestFunctions.throwError';
			const response = `<python-code>${functionName}</python-code>`;
			mockLLM.setResponse(response);
			await startAgent(runConfig({ functions }));
			let agent = await waitForAgent();

			await cancelAgent(agent.agentId, agent.executionId, 'cancelled');
			agent = await waitForAgent();

			expect(agent.state).to.equal('completed');
			const functionCallResult = agent.functionCallHistory.find((call) => call.function_name === SUPERVISOR_CANCELLED_FUNCTION_NAME);
			expect(functionCallResult.stdout).to.equal('cancelled');
		});
	});

	describe('LLM calls', () => {
		it('should have the call stack', async () => {
			functions.addFunctionClass(TestFunctions);
			mockLLM.addResponse(SKY_COLOUR_FUNCTION_CALL_PLAN);
			mockLLM.addResponse('blue');
			mockLLM.addResponse(COMPLETE_FUNCTION_CALL_PLAN);
			await startAgent(runConfig({ functions }));
			const agent = await waitForAgent();
			logger.info(`agent error:${agent.error}`);
			expect(agent.state).to.equal('completed');

			const calls = await appContext().llmCallService.getLlmCallsForAgent(agent.agentId);
			expect(calls.length).to.equal(3);
			const skyCall = calls[1];
			expect(skyCall.callStack).to.equal(`skyColour > generateText`);
			expect(skyCall.responseText).to.equal('blue');
		});
	});

	describe('TypeScript to Python Type Conversion', () => {
		it('should convert "string" to "str"', () => {
			const result = convertTypeScriptToPython('string');
			expect(result).to.equal('str');
		});

		it('should convert "number" to "float"', () => {
			const result = convertTypeScriptToPython('number');
			expect(result).to.equal('float');
		});

		it('should convert "boolean" to "bool"', () => {
			const result = convertTypeScriptToPython('boolean');
			expect(result).to.equal('bool');
		});

		it('should convert "any" to "Any"', () => {
			const result = convertTypeScriptToPython('any');
			expect(result).to.equal('Any');
		});

		it('should convert "void" to "None"', () => {
			const result = convertTypeScriptToPython('void');
			expect(result).to.equal('None');
		});

		it('should convert "undefined" to "None"', () => {
			const result = convertTypeScriptToPython('undefined');
			expect(result).to.equal('None');
		});

		it('should convert "null" to "None"', () => {
			const result = convertTypeScriptToPython('null');
			expect(result).to.equal('None');
		});

		it('should convert "Array<string>" to "List<str>"', () => {
			const result = convertTypeScriptToPython('Array<string>');
			expect(result).to.equal('List<str>');
		});

		it('should handle multiple types "string | number | boolean"', () => {
			const result = convertTypeScriptToPython('string | number | boolean');
			expect(result).to.equal('str | float | bool');
		});

		it('should handle generic arrays "Array<number> | Array<boolean>"', () => {
			const result = convertTypeScriptToPython('Array<number> | Array<boolean>');
			expect(result).to.equal('List<float> | List<bool>');
		});
	});
});
