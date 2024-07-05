import { HarmBlockThreshold, HarmCategory, SafetySetting, VertexAI } from '@google-cloud/vertexai';
import { AgentLLMs, addCost, agentContext } from '#agent/agentContext';
import { CallerId } from '#llm/llmCallService/llmCallService';
import { CreateLlmResponse } from '#llm/llmCallService/llmRequestResponse';
import { logger } from '#o11y/logger';
import { withActiveSpan } from '#o11y/trace';
import { currentUser } from '#user/userService/userContext';
import { envVar } from '#utils/env-var';
import { appContext } from '../../app';
import { BaseLLM } from '../base-llm';
import { GenerateTextOptions, LLM, combinePrompts, logTextGeneration } from '../llm';
import { MultiLLM } from '../multi-llm';

export function GEMINI_1_5_PRO_LLMS(): AgentLLMs {
	const pro1_5 = Gemini_1_5_Pro();
	return {
		easy: Gemini_1_5_Flash(),
		medium: pro1_5,
		hard: pro1_5,
		xhard: new MultiLLM([pro1_5], 5),
	};
}

export const VERTEX_SERVICE = 'vertex';

export function vertexLLMRegistry(): Record<string, () => LLM> {
	return {
		[`${VERTEX_SERVICE}:gemini-experimental`]: Gemini_1_5_Experimental,
		[`${VERTEX_SERVICE}:gemini-1.5-pro`]: Gemini_1_5_Pro,
		[`${VERTEX_SERVICE}:gemini-1.5-flash`]: Gemini_1_5_Flash,
	};
}

// A token is equivalent to about 4 characters for Gemini models. 100 tokens are about 60-80 English words.
// https://ai.google.dev/gemini-api/docs/models/gemini#token-size
// https://cloud.google.com/vertex-ai/generative-ai/pricing

// gemini-1.5-pro-latest
export function Gemini_1_5_Pro(version = '001') {
	return new VertexLLM('Gemini 1.5 Pro', VERTEX_SERVICE, `gemini-1.5-pro-${version}`, 1_000_000, 0.00125 / 1000, 0.00375 / 1000);
}

export function Gemini_1_5_Experimental() {
	return new VertexLLM('Gemini experimental', VERTEX_SERVICE, 'gemini-experimental', 1_000_000, 0.0036 / 1000, 0.018 / 1000);
}

export function Gemini_1_5_Flash(version = '001') {
	return new VertexLLM('Gemini 1.5 Flash', VERTEX_SERVICE, `gemini-1.5-flash-${version}`, 1_000_000, 0.000125 / 1000, 0.000375 / 1000);
}

/**
 * Vertex AI models - Gemini
 */
class VertexLLM extends BaseLLM {
	_vertex: VertexAI;

	vertex(): VertexAI {
		if (!this._vertex) {
			this._vertex = new VertexAI({
				project: currentUser().llmConfig.vertexProjectId ?? envVar('GCLOUD_PROJECT'),
				location: currentUser().llmConfig.vertexRegion ?? envVar('GCLOUD_REGION'),
			});
		}
		return this._vertex;
	}

	@logTextGeneration
	async generateText(userPrompt: string, systemPrompt?: string, opts?: GenerateTextOptions): Promise<string> {
		return withActiveSpan(`generateText ${opts?.id}`, async (span) => {
			if (systemPrompt) span.setAttribute('systemPrompt', systemPrompt);

			const promptLength = userPrompt.length + systemPrompt?.length ?? 0;

			span.setAttributes({
				userPrompt,
				inputChars: promptLength,
				model: this.model,
			});

			const caller: CallerId = { agentId: agentContext().agentId };
			const llmRequestSave = appContext().llmCallService.saveRequest(userPrompt, systemPrompt);
			const requestTime = Date.now();

			const generativeModel = this.vertex().getGenerativeModel({
				model: this.model,
				systemInstruction: systemPrompt ? { role: 'system', parts: [{ text: systemPrompt }] } : undefined,
				generationConfig: {
					maxOutputTokens: 8192,
					temperature: opts?.temperature,
					topP: opts?.temperature,
					stopSequences: ['</response>'],
				},
				safetySettings: SAFETY_SETTINGS,
			});

			// const request = {
			// 	contents: [{ role: 'user', parts: [{ text: prompt }] }],
			// };

			// const inputTokens = await generativeModel.countTokens(request);

			const streamingResp = await generativeModel.generateContentStream(userPrompt);
			let responseText = '';
			let timeToFirstToken = null;
			for await (const item of streamingResp.stream) {
				if (!timeToFirstToken) timeToFirstToken = Date.now() - requestTime;
				if (item.candidates[0]?.content?.parts?.length > 0) {
					responseText += item.candidates[0].content.parts[0].text;
				}
			}

			const finishTime = Date.now();
			const llmRequest = await llmRequestSave;
			const llmResponse: CreateLlmResponse = {
				llmId: this.getId(),
				llmRequestId: llmRequest.id,
				responseText: responseText,
				requestTime,
				timeToFirstToken,
				totalTime: finishTime - requestTime,
				callStack: agentContext().callStack.join(' > '),
			};
			logger.info(`Call stack: ${agentContext().callStack.join(' > ')}`);
			try {
				await appContext().llmCallService.saveResponse(llmRequest.id, caller, llmResponse);
			} catch (e) {
				logger.error(e);
			}

			const inputCost = promptLength * this.getInputCostPerToken();
			const outputCost = responseText.length * this.getOutputCostPerToken();
			const cost = inputCost + outputCost;

			span.setAttributes({
				inputChars: promptLength,
				outputChars: responseText.length,
				response: responseText,
				inputCost,
				outputCost,
				cost,
			});
			addCost(cost);

			return responseText;
		});
	}
}

const SAFETY_SETTINGS: SafetySetting[] = [
	{
		category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
		threshold: HarmBlockThreshold.BLOCK_NONE,
	},
	{
		category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
		threshold: HarmBlockThreshold.BLOCK_NONE,
	},
	{
		category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
		threshold: HarmBlockThreshold.BLOCK_NONE,
	},
	{
		category: HarmCategory.HARM_CATEGORY_HARASSMENT,
		threshold: HarmBlockThreshold.BLOCK_NONE,
	},
];
