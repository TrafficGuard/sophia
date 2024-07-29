import axios from 'axios';
import { expect } from 'chai';
import sinon from 'sinon';
import { logger } from '#o11y/logger';

import { FirestoreLlmCallService } from '#llm/llmCallService/firestoreLlmCallService';
import { LlmCallService } from '#llm/llmCallService/llmCallService';
import { LlmCall } from '#llm/llmCallService/llmCall';

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


	describe('saveResponse and getResponse', () => {
		it('should save and load all the values', async () => {
		});
	});

	describe('getLlmCallsForAgent', () => {
		it('should load all the responses for an agent', async () => {

		});
	});
});
