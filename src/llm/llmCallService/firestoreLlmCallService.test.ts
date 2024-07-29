import axios from 'axios';
import { expect } from 'chai';
import sinon from 'sinon';
import { logger } from '#o11y/logger';

import { FirestoreLlmCallService } from '#llm/llmCallService/firestoreLlmCallService';
import { LlmCallService } from '#llm/llmCallService/llmCallService';
import {CreateLlmRequest, LlmCall} from '#llm/llmCallService/llmCall';

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
				caller: { agentId: 'test-agent' },
				callStack: 'test > call > stack'
			};

			const savedRequest = await service.saveRequest(request);
			expect(savedRequest).to.have.property('id');
			expect(savedRequest).to.have.property('requestTime');

			const retrievedCall = await service.getCall(savedRequest.id);
			expect(retrievedCall).to.not.be.null;
			expect(retrievedCall).to.deep.include(request);
		});
	});

	describe('saveResponse', () => {
		it('should save a response and retrieve it', async () => {
			const request: CreateLlmRequest = {
				userPrompt: 'Test user prompt',
				systemPrompt: 'Test system prompt',
				description: 'Test description',
				llmId: 'test-llm',
				caller: { agentId: 'test-agent', userId: 'test-user' },
				callStack: 'test > call > stack'
			};

			const savedRequest = await service.saveRequest(request);

			const response: LlmCall = {
				...savedRequest,
				responseText: 'Test response',
				cost: 0.1,
				timeToFirstToken: 100,
				totalTime: 500
			};

			await service.saveResponse(response);

			const retrievedCall = await service.getCall(savedRequest.id);
			expect(retrievedCall).to.deep.equal(response);
		});
	});

	describe('getLlmCallsForAgent', () => {
		it('should load all the responses for an agent', async () => {
			const agentId = 'test-agent';
			const requests: CreateLlmRequest[] = [
				{
					userPrompt: 'Test user prompt 1',
					systemPrompt: 'Test system prompt 1',
					description: 'Test description 1',
					llmId: 'test-llm-1',
					caller: { agentId, userId: 'test-user-1' },
					callStack: 'test > call > stack'
				},
				{
					userPrompt: 'Test user prompt 2',
					systemPrompt: 'Test system prompt 2',
					description: 'Test description 2',
					llmId: 'test-llm-2',
					caller: { agentId, userId: 'test-user-2' },
					callStack: 'test > call > stack'
				}
			];

			for (const request of requests) {
				const savedRequest = await service.saveRequest(request);
				await service.saveResponse({
					...savedRequest,
					responseText: `Response for ${request.userPrompt}`,
					cost: 0.1,
					timeToFirstToken: 100,
					totalTime: 500
				});
			}

			const calls = await service.getLlmCallsForAgent(agentId);
			expect(calls).to.have.lengthOf(2);
			expect(calls[0].agentId).to.equal(agentId);
			expect(calls[1].agentId).to.equal(agentId);
			// expect(calls).to.be.sortedBy('requestTime', { descending: true });
		});
	});
});
