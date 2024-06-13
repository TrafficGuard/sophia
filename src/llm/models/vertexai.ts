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
import { LLM, combinePrompts, logTextGeneration } from '../llm';
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
		[`${VERTEX_SERVICE}:gemini-1.5-pro-preview-0409`]: Gemini_1_5_Pro,
		[`${VERTEX_SERVICE}:gemini-experimental`]: Gemini_1_5_Experimental,
		[`${VERTEX_SERVICE}:gemini-1.5-flash-preview-0514`]: Gemini_1_5_Flash,

		[`${VERTEX_SERVICE}:gemini-1.5-pro`]: Gemini_1_5_Pro,
		[`${VERTEX_SERVICE}:gemini-1.5-flash`]: Gemini_1_5_Flash,
	};
}

// A token is equivalent to about 4 characters for Gemini models. 100 tokens are about 60-80 English words.
// https://ai.google.dev/gemini-api/docs/models/gemini#token-size
// https://cloud.google.com/vertex-ai/generative-ai/pricing

// gemini-1.5-pro-latest
export function Gemini_1_5_Pro() {
	return new VertexLLM(VERTEX_SERVICE, 'gemini-1.5-pro-preview-0409', 1_000_000, 0.00125 / 1000, 0.00375 / 1000);
}

export function Gemini_1_5_Experimental() {
	return new VertexLLM(VERTEX_SERVICE, 'gemini-experimental', 1_000_000, 0.0036 / 1000, 0.018 / 1000);
}

export function Gemini_1_5_Flash() {
	return new VertexLLM(VERTEX_SERVICE, 'gemini-1.5-flash-preview-0514', 1_000_000, 0.000125 / 1000, 0.000375 / 1000);
}

/**
 * Vertex AI models - Gemini
 */
class VertexLLM extends BaseLLM {
	vertexAI = new VertexAI({
		project: currentUser().llmConfig.vertexProjectId ?? envVar('GCLOUD_PROJECT'),
		location: currentUser().llmConfig.vertexRegion ?? envVar('GCLOUD_REGION'),
	});

	@logTextGeneration
	async generateText(userPrompt: string, systemPrompt: string): Promise<string> {
		return withActiveSpan('generateText', async (span) => {
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

			const generativeModel = this.vertexAI.preview.getGenerativeModel({
				model: this.model,
				systemInstruction: systemPrompt ? { role: 'system', parts: [{ text: systemPrompt }] } : undefined,
				generationConfig: {
					maxOutputTokens: 8192,
					temperature: 1,
					topP: 0.95,
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

	/*
	generateTextExpectingFunctions(userPrompt: string, systemPrompt?: string): Promise<FunctionResponse> {
		console.log(this.model, 'generateTextExpectingFunctions ========================')
		return withActiveSpan('generateText', async (span) => {
			const prompt = combinePrompts(userPrompt, systemPrompt);

			if (systemPrompt) span.setAttribute('systemPrompt', systemPrompt);
			span.setAttributes({
				userPrompt,
				inputChars: prompt.length,
				model: this.model,
			});

			const funcDefinitions = agentContext.getStore().toolbox.getToolDefinitions();
			const tools: Tool[] = [convertFunctionDefinitionsToTool(funcDefinitions)];
			const generativeModel = vertexAI.preview.getGenerativeModel({
				model: this.model,
				generationConfig: {
					maxOutputTokens: this.model.includes('1.5-pro') ? 8192 : 4096,
					temperature: 1,
					topP: 0.95,
					stopSequences: ['</response>'],
				},
				safetySettings: SAFETY_SETTINGS,
			});

			const request: GenerateContentRequest = {
				contents: [{ role: 'user', parts: [{ text: prompt }] }],
				tools,
				generationConfig: {},
				// TODO when supported in nodejs library - tool_config mode ANY	The model must predict only function calls. To limit the model to a subset of functions, define the allowed function names in allowed_function_names.
			};

			const resp = await generativeModel.generateContent(request);
			const textResponse = '';
			const funcCall: FunctionCall | undefined = resp.response.candidates[0].content.parts[0].functionCall;

			// check for text part

			const inputCost = prompt.length * this.getInputCostPerToken();
			const outputCost = 0; //response.length * this.getOutputCostPerToken();
			const cost = inputCost + outputCost;
			const outputChars = 0;
			console.log(this.model, 'input', prompt.length, 'output', textResponse.length);
			span.setAttributes({
				inputChars: prompt.length,
				outputChars,
				response: textResponse,
				inputCost,
				outputCost,
				cost,
			});
			addCost(cost);

			if (!funcCall) throw new Error('No function call found in response'); // TODO make into FunctionCallMissingError

			const invoke: Invoke = {
				tool_name: funcCall.name,
				parameters: funcCall.args,
			};
			const funcResponse: FunctionResponse = {
				response: '',
				functions: {
					invoke: [invoke],
				},
			};

			return funcResponse;
		});
	}
	//*/
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
