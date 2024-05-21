import axios from 'axios';
import { expect } from 'chai';
import sinon from 'sinon';
import { logger } from '#o11y/logger';

import { FirestoreLlmCallService } from '#llm/llmCallService/firestoreLlmCallService';
import { LLMCall, LlmCallService } from '#llm/llmCallService/llmCallService';
import { LlmResponse } from '#llm/llmCallService/llmRequestResponse';

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

	// test with null systemPrompt

	describe('saveRequest', () => {
		it('should save and load the same object', async () => {
			const llmRequestSave = await service.saveRequest('user prompt', 'system prompt');
			const llmRequestLoad = await service.getRequest(llmRequestSave.id);
			expect(llmRequestSave.id).to.equal(llmRequestLoad.id);
			expect(llmRequestSave.userPromptText).to.equal(llmRequestLoad.userPromptText);
			expect(llmRequestSave.systemPromptId).to.equal(llmRequestLoad.systemPromptId);

			// Test with variationSourceId and variationNote
			const llmVariationSave = await service.saveRequest('user prompt2', 'system prompt', llmRequestSave.id, 'note');
			const llmVariationLoad = await service.getRequest(llmVariationSave.id);
			expect(llmVariationSave.variationSourceId).to.equal(llmVariationLoad.variationSourceId);
			expect(llmVariationSave.variationNote).to.equal(llmVariationLoad.variationNote);
		});

		it('should only create one SystemPrompt with particular text, always creates unique UserPrompt objects when the prompt text is the same', async () => {
			const llmRequest1 = await service.saveRequest('user prompt', 'system prompt');

			const systemPrompt1 = await service.getSystemPromptByText('system prompt');
			expect(systemPrompt1).to.not.be.null;
			expect(systemPrompt1.text).to.equal('system prompt');

			const llmRequest2 = await service.saveRequest('user prompt', 'system prompt');

			const systemPrompt2 = await service.getSystemPromptByText('system prompt');
			expect(systemPrompt2).to.not.be.null;
			expect(systemPrompt2.text).to.equal('system prompt');

			// Should be the same SystemPrompt object as the text is the same
			expect(systemPrompt1.id).to.equal(systemPrompt2.id);
			// Should be the same LlmRequest object as the text is the same
			expect(llmRequest1.id).to.equal(llmRequest2.id);
		});
	});

	describe('saveResponse and getResponse', () => {
		it('should save and load all the values', async () => {
			const llmRequest = await service.saveRequest('user prompt', 'system prompt');

			const responseId = await service.saveResponse(
				llmRequest.id,
				{ agentId: 'agentId' },
				{
					timeToFirstToken: 100,
					llmId: 'vertex:gemini-1.5-pro',
					llmRequestId: llmRequest.id,
					requestTime: 1000,
					responseText: 'so smart',
					totalTime: 200,
				},
			);
			const response: LlmResponse = await service.getResponse(responseId);

			expect(response.agentId).to.equal('agentId');
			expect(response.timeToFirstToken).to.equal(100);
			expect(response.llmId).to.equal('vertex:gemini-1.5-pro');
			expect(response.llmRequestId).to.equal(llmRequest.id);
			expect(response.requestTime).to.equal(1000);
			expect(response.responseText).to.equal('so smart');
			expect(response.totalTime).to.equal(200);
		});
	});

	describe('getLlmCallsForAgent', () => {
		it('should load all the responses for an agent', async () => {
			const llmRequest1 = await service.saveRequest('user prompt', 'system prompt');
			const llmId = 'vertex:gemini-1.5-pro';
			await service.saveResponse(
				llmRequest1.id,
				{ agentId: 'agentId' },
				{
					timeToFirstToken: 1100,
					llmId,
					llmRequestId: llmRequest1.id,
					requestTime: 1000,
					responseText: 'take1',
					totalTime: 200,
				},
			);

			await service.saveResponse(
				llmRequest1.id,
				{ agentId: 'agentId' },
				{
					timeToFirstToken: 1100,
					llmId,
					llmRequestId: llmRequest1.id,
					requestTime: 2000,
					responseText: 'take2',
					totalTime: 200,
				},
			);

			const calls: LLMCall[] = await service.getLlmCallsForAgent('agentId');
			expect(calls.length).to.equal(2);
			expect(calls.some((call) => call.response.responseText === 'take1')).to.be.true;
			expect(calls.some((call) => call.response.responseText === 'take2')).to.be.true;
			const call = calls[0];
			// The request, response and system prompt should be loaded
			expect(call.request).to.not.be.null;
			expect(call.request.id).to.equal(llmRequest1.id);
			expect(call.request.userPromptText).to.equal('user prompt');
			expect(call.request.systemPrompt).to.not.be.undefined;
			expect(call.request.systemPrompt.text).to.equal('system prompt');
		});
	});
});
