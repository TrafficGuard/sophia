import axios from 'axios';
import { expect } from 'chai';
import sinon from 'sinon';
import { logger } from '#o11y/logger';

import { CreateLlmRequest, LlmCall } from '#llm/llmCallService/llmCall';
import { LlmCallService } from '#llm/llmCallService/llmCallService';
import { FirestoreLlmCallService } from '#modules/firestore/firestoreLlmCallService';

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;

// https://cloud.google.com/datastore/docs/emulator#reset_emulator_data
const instance = axios.create({
	baseURL: `http://${emulatorHost}/`,
});

// TODO test saving fields longer than 1500 chars
// https://groups.google.com/g/google-appengine/c/hjvWMM9ijkw
describe('FirestoreLlmCallService', () => {
	let service: LlmCallService;

	beforeEach(async () => {
		service = new FirestoreLlmCallService();

		try {
			const response = await instance.post('reset');

			// Axios throws an error for responses outside the 2xx range, so the following check is optional
			// and generally not needed unless you configure axios to not throw on certain status codes.
			if (response.status !== 200) {
				logger.error('Failed to reset emulator data:', response.status, response.statusText);
			}
		} catch (error) {
			// Axios encapsulates the response error as error.response
			if (error.response) {
				logger.error('Failed to reset emulator data:', error.response.status, error.response.statusText);
			} else {
				logger.error(error, 'Error resetting emulator data:');
			}
		}
	});

	describe('saveRequest and getCall', () => {
		it('should save a request and retrieve it', async () => {
			const request: CreateLlmRequest = {
				userPrompt: 'Test user prompt',
				systemPrompt: 'Test system prompt',
				description: 'Test description',
				llmId: 'test-llm',
				agentId: 'test-agent',
				callStack: 'test > call > stack',
			};

			const savedRequest = await service.saveRequest(request);
			expect(savedRequest).to.have.property('id');
			expect(savedRequest).to.have.property('requestTime');

			const retrievedCall = await service.getCall(savedRequest.id);
			expect(retrievedCall).to.not.be.null;
			expect(retrievedCall.userPrompt).to.equal(request.userPrompt);
			expect(retrievedCall.systemPrompt).to.equal(request.systemPrompt);
			expect(retrievedCall.description).to.equal(request.description);
			expect(retrievedCall.llmId).to.equal(request.llmId);
			expect(retrievedCall.agentId).to.equal(request.agentId);
			expect(retrievedCall.callStack).to.equal(request.callStack);
		});
	});

	describe('saveResponse', () => {
		it('should save a response and retrieve it', async () => {
			const request: CreateLlmRequest = {
				userPrompt: 'Test user prompt',
				systemPrompt: 'Test system prompt',
				description: 'Test description',
				llmId: 'test-llm',
				agentId: 'test-agent',
				callStack: 'test > call > stack',
			};

			const savedRequest = await service.saveRequest(request);

			const response: LlmCall = {
				...savedRequest,
				responseText: 'Test response',
				cost: 0.1,
				timeToFirstToken: 100,
				totalTime: 500,
			};

			await service.saveResponse(response);

			const retrievedCall = await service.getCall(savedRequest.id);
			expect(retrievedCall).to.not.be.null;
			expect(retrievedCall.id).to.equal(response.id);
			expect(retrievedCall.userPrompt).to.equal(response.userPrompt);
			expect(retrievedCall.systemPrompt).to.equal(response.systemPrompt);
			expect(retrievedCall.description).to.equal(response.description);
			expect(retrievedCall.llmId).to.equal(response.llmId);
			expect(retrievedCall.agentId).to.equal(request.agentId);
			expect(retrievedCall.callStack).to.equal(response.callStack);
			expect(retrievedCall.responseText).to.equal(response.responseText);
			expect(retrievedCall.cost).to.equal(response.cost);
			expect(retrievedCall.timeToFirstToken).to.equal(response.timeToFirstToken);
			expect(retrievedCall.totalTime).to.equal(response.totalTime);
		});
	});

	describe('getLlmCallsForAgent', () => {
		it('should load all the responses for an agent', async () => {
			const agentId = 'test-agent';
			const requests: CreateLlmRequest[] = [
				{
					agentId,
					userPrompt: 'Test user prompt 1',
					systemPrompt: 'Test system prompt 1',
					description: 'Test description 1',
					llmId: 'test-llm-1',
					callStack: 'test > call > stack',
				},
				{
					agentId,
					userPrompt: 'Test user prompt 2',
					systemPrompt: 'Test system prompt 2',
					description: 'Test description 2',
					llmId: 'test-llm-2',
					callStack: 'test > call > stack',
				},
			];

			for (const request of requests) {
				const savedRequest = await service.saveRequest(request);
				await service.saveResponse({
					...savedRequest,
					responseText: `Response for ${request.userPrompt}`,
					cost: 0.1,
					timeToFirstToken: 100,
					totalTime: 500,
				});
			}

			const calls = await service.getLlmCallsForAgent(agentId);
			expect(calls).to.have.lengthOf(2);
			calls.forEach((call) => {
				expect(call).to.have.property('agentId');
				expect(call).to.have.property('id');
				expect(call).to.have.property('userPrompt');
				expect(call).to.have.property('systemPrompt');
				expect(call).to.have.property('description');
				expect(call).to.have.property('llmId');
				expect(call).to.have.property('callStack');
				expect(call).to.have.property('responseText');
				expect(call).to.have.property('cost');
				expect(call).to.have.property('timeToFirstToken');
				expect(call).to.have.property('totalTime');
				expect(call).to.have.property('requestTime');
			});
			expect(calls[0].requestTime).to.be.greaterThan(calls[1].requestTime);
		});
	});
});
