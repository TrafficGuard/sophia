import { randomUUID } from 'crypto';
import { DocumentSnapshot, Firestore } from '@google-cloud/firestore';
import { CallerId, LLMCall, LlmCallService } from '#llm/llmCallService/llmCallService';
import { CreateLlmResponse, LlmRequest, LlmResponse, SystemPrompt } from '#llm/llmCallService/llmRequestResponse';
import { logger } from '#o11y/logger';
import { envVar } from '#utils/env-var';
import { isNotNullish } from '#utils/functional';

/**
 * Returns a hash code from a string. Port of the Java string hashcode.
 * Used to calculate the id for a system prompt text
 * @param  {String} str The string to hash.
 * @return {Number}    A 32bit integer
 * @see http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
 */
function promptId(str: string): string {
	let hash = 0;
	for (let i = 0, len = str.length; i < len; i++) {
		const chr = str.charCodeAt(i);
		hash = (hash << 5) - hash + chr;
		hash |= 0; // Convert to 32bit integer
	}
	return hash.toString();
}
function systemPromptFromDocument(document: DocumentSnapshot): SystemPrompt {
	const data = document.data();
	return {
		id: parseInt(document.id),
		text: data.text,
		variationNote: data.variationNote,
		variationSourceId: data.variationSourceId,
	};
}

export class FirestoreLlmCallService implements LlmCallService {
	db: Firestore;
	constructor() {
		this.db = new Firestore({
			projectId: process.env.FIRESTORE_EMULATOR_HOST ? undefined : envVar('GCLOUD_PROJECT'),
			databaseId: process.env.FIRESTORE_DATABASE,
			ignoreUndefinedProperties: true,
		});
	}

	/**
	 * Retrieves LlmResponse entities from the Firestore based on the provided agentId.
	 * @param {string} agentId - The agentId to filter the LlmResponse entities.
	 * @returns {Promise<LlmResponse[]>} - A promise that resolves to an array of LlmResponse entities.
	 */
	private async getLlmResponsesByAgentId(agentId: string): Promise<LlmResponse[]> {
		const querySnapshot = await this.db.collection('LlmResponse').where('agentId', '==', agentId).get();
		return querySnapshot.docs.map((doc) => {
			const data = doc.data();
			const llmResponse: LlmResponse = {
				id: doc.id,
				llmRequestId: data.llmRequestId,
				responseText: data.responseText,
				llmId: data.llmId,
				requestTime: data.requestTime,
				timeToFirstToken: data.firstResponse,
				totalTime: data.totalTime,
				agentId: data.agentId,
				userId: data.userId,
				callStack: data.callStack,
			};
			return llmResponse;
		});
	}

	/**
	 * Retrieves LlmRequest entities from the Firestore using the provided keys.
	 * @param {number[]} requestIds - The keys to retrieve the LlmRequest entities.
	 * @returns {Promise<LlmRequest[]>} - A promise that resolves to an array of LlmRequest entities.
	 */
	private async getLlmRequests(requestIds: number[]): Promise<LlmRequest[]> {
		const requests: LlmRequest[] = [];
		for (const id of requestIds) {
			const docRef = this.db.doc(`LlmRequest/${id.toString()}`);
			const docSnap: DocumentSnapshot = await docRef.get();
			if (docSnap.exists) {
				requests.push({
					id,
					systemPromptId: docSnap.data().systemPromptId,
					userPromptText: docSnap.data().userPromptText,
					variationSourceId: docSnap.data().variationSourceId,
					variationNote: docSnap.data().variationNote,
				});
			}
		}
		return requests;
	}

	/**
	 * Retrieves SystemPrompt entities from the Firestore and maps them by id.
	 * @param {number[]} systemPromptIds - The ids of the SystemPrompt entities to retrieve.
	 * @returns {Promise<Map<number, SystemPrompt>>} - A promise that resolves to a map of SystemPrompt entities by id.
	 */
	private async getSystemPromptsMap(systemPromptIds: number[]): Promise<Map<number, SystemPrompt>> {
		const systemPromptsMap = new Map<number, SystemPrompt>();
		for (const id of systemPromptIds.filter(isNotNullish)) {
			const docRef = this.db.doc(`SystemPrompt/${id.toString()}`);
			const docSnap: DocumentSnapshot = await docRef.get();
			if (docSnap.exists) {
				systemPromptsMap.set(id, systemPromptFromDocument(docSnap));
			}
		}
		return systemPromptsMap;
	}

	async getLlmCallsForAgent(agentId: string): Promise<LLMCall[]> {
		// Retrieve LlmResponse entities for the given agentId
		const llmResponses: LlmResponse[] = await this.getLlmResponsesByAgentId(agentId);
		// Retrieve LlmRequest entities
		const requests = await this.getLlmRequests(llmResponses.map((response) => response.llmRequestId));
		// Create a Set of unique systemPromptIds from the LlmRequest entities
		const systemPromptIds = new Set(requests.map((req) => req.systemPromptId));
		// Retrieve SystemPrompt entities and map them by id
		const systemPromptsMap = await this.getSystemPromptsMap(Array.from(systemPromptIds));
		// Construct LlmCall objects by associating each response with its corresponding request and system prompt
		return llmResponses
			.map((llmResponse) => {
				const request = requests.find((llmRequest) => llmRequest.id === llmResponse.llmRequestId);
				if (request) {
					request.systemPrompt = systemPromptsMap.get(request.systemPromptId);
				} else {
					logger.warn(`Couldn't find request with id ${llmResponse.llmRequestId}`);
				}
				return { request, response: llmResponse };
			})
			.sort((a, b) => (a.response.requestTime < b.response.requestTime ? 1 : -1));
	}

	async saveRequest(userPrompt: string, systemPrompt?: string, variationSourceId?: number, variationNote?: string): Promise<LlmRequest> {
		// Only in the Primary Key we have the id at a string. In the other object fields we store the foreign key as a number
		const systemPromptKeyId = systemPrompt?.trim().length ? promptId(systemPrompt) : null;
		const systemPromptId = systemPromptKeyId ? parseInt(systemPromptKeyId) : null;
		const llmRequestKeyId = promptId(systemPrompt + userPrompt);
		const llmRequestDocRef = this.db.doc(`LlmRequest/${llmRequestKeyId}`);
		const systemPromptDocRef = systemPromptKeyId ? this.db.doc(`SystemPrompt/${systemPromptKeyId}`) : null;

		try {
			if (systemPromptId) {
				const systemPromptSnap: DocumentSnapshot = await systemPromptDocRef.get();
				if (!systemPromptSnap.exists) {
					await systemPromptDocRef.set({
						text: systemPrompt,
					});
				}
			}

			const llmRequestSnap: DocumentSnapshot = await llmRequestDocRef.get();
			if (!llmRequestSnap.exists) {
				let requestProps: Partial<LlmRequest> = {
					userPromptText: userPrompt,
				};
				if (systemPromptId) {
					requestProps = {
						...requestProps,
						systemPromptId: parseInt((await systemPromptDocRef.get()).id),
						variationSourceId,
						variationNote,
					};
				}
				await llmRequestDocRef.set(requestProps);
			}

			const requestResult: LlmRequest = {
				id: parseInt(llmRequestKeyId),
				systemPromptId: systemPromptId ? parseInt(systemPromptDocRef.id) : undefined,
				userPromptText: userPrompt,
			};
			if (variationSourceId) {
				requestResult.variationSourceId = variationSourceId;
				requestResult.variationNote = variationNote;
			}
			return requestResult;
		} catch (error) {
			logger.error(error, 'Error saving request');
			throw error;
		}
	}

	async saveResponse(requestId: number, caller: CallerId, llmResponse: CreateLlmResponse): Promise<string> {
		const id = randomUUID();
		const llmResponseDocRef = this.db.doc(`LlmResponse/${id}`);
		try {
			const responseProps: Partial<LlmResponse> = {
				llmId: llmResponse.llmId,
				llmRequestId: requestId,
				responseText: llmResponse.responseText,
				requestTime: llmResponse.requestTime,
				timeToFirstToken: llmResponse.timeToFirstToken,
				totalTime: llmResponse.totalTime,
				callStack: llmResponse.callStack,
				userId: llmResponse.userId,
			};
			if (caller.agentId) responseProps.agentId = caller.agentId;
			if (caller.userId) responseProps.agentId = caller.userId;
			await llmResponseDocRef.set(responseProps);
			return id;
		} catch (error) {
			logger.error(error, 'Error saving response');
			throw error;
		}
	}

	async getRequest(llmRequestId: number): Promise<LlmRequest | null> {
		const docRef = this.db.doc(`LlmRequest/${llmRequestId.toString()}`);
		const docSnap: DocumentSnapshot = await docRef.get();
		if (!docSnap.exists) {
			return null;
		}
		return {
			id: llmRequestId,
			systemPromptId: docSnap.data().systemPromptId,
			userPromptText: docSnap.data().userPromptText,
			variationSourceId: docSnap.data().variationSourceId,
			variationNote: docSnap.data().variationNote,
		};
	}

	async getSystemPromptByText(promptText: string): Promise<SystemPrompt | null> {
		const docRef = this.db.doc(`SystemPrompt/${promptId(promptText)}`);
		const docSnap: DocumentSnapshot = await docRef.get();
		if (!docSnap.exists) return null;
		return systemPromptFromDocument(docSnap);
	}

	async getResponse(llmResponseId: string): Promise<LlmResponse | null> {
		const docRef = this.db.doc(`LlmResponse/${llmResponseId}`);
		const docSnap: DocumentSnapshot = await docRef.get();
		if (!docSnap.exists) {
			return null;
		}
		const data = docSnap.data();
		return {
			id: docSnap.id,
			llmRequestId: data.llmRequestId,
			responseText: data.responseText,
			llmId: data.llmId,
			requestTime: data.requestTime,
			timeToFirstToken: data.timeToFirstToken,
			totalTime: data.totalTime,
			agentId: data.agentId,
			userId: data.userId,
		};
	}
}
