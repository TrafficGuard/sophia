import { FunctionCall, GenerateContentRequest, HarmBlockThreshold, HarmCategory, SafetySetting, Tool, VertexAI } from '@google-cloud/vertexai';
import { AgentLLMs, addCost, agentContext } from '#agent/agentContext';
import { withActiveSpan } from '#o11y/trace';
import { projectId, region } from '../../config';
import { BaseLLM } from '../base-llm';
import { FunctionResponse, Invoke, LLM, combinePrompts, logTextGeneration } from '../llm';
import { MultiLLM } from '../multi-llm';

const vertexAI = new VertexAI({ project: projectId, location: region });

export function GEMINI_1_0_PRO_LLMS(): AgentLLMs {
	const pro1_0 = Gemini_1_0_Pro();
	return {
		easy: pro1_0,
		medium: pro1_0,
		hard: pro1_0,
		xhard: new MultiLLM([pro1_0], 5),
	};
}

export function GEMINI_1_5_PRO_LLMS(): AgentLLMs {
	const pro1_5 = Gemini_1_5_Pro();
	return {
		easy: pro1_5,
		medium: pro1_5,
		hard: pro1_5,
		xhard: new MultiLLM([pro1_5], 5),
	};
}

export function Gemini_1_0_Pro() {
	return new VertexLLM(VERTEX_SERVICE, 'gemini-1.0-pro-001', 32_000, 0.0036 / 1000, 0.018 / 1000);
}

// gemini-1.5-pro-latest
export function Gemini_1_5_Pro() {
	return new VertexLLM(VERTEX_SERVICE, 'gemini-1.5-pro-preview-0409', 1_000_000, 0.0036 / 1000, 0.018 / 1000);
}

export const VERTEX_SERVICE = 'vertex';

export function vertexLLmFromModel(model: string): LLM | null {
	if (model.startsWith('gemini-1.0-pro')) return Gemini_1_0_Pro();
	if (model.startsWith('gemini-1.5-pro')) return Gemini_1_5_Pro();
	return null;
}

/**
 * Vertex AI models - Gemini
 */
class VertexLLM extends BaseLLM {
	@logTextGeneration
	async generateText(userPrompt: string, systemPrompt: string): Promise<string> {
		return withActiveSpan('generateText', async (span) => {
			const prompt = combinePrompts(userPrompt, systemPrompt);

			if (systemPrompt) span.setAttribute('systemPrompt', systemPrompt);
			span.setAttributes({
				userPrompt,
				inputChars: prompt.length,
				model: this.model,
			});

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

			const request = {
				contents: [{ role: 'user', parts: [{ text: prompt }] }],
			};

			// const inputTokens = await generativeModel.countTokens(request);

			const streamingResp = await generativeModel.generateContentStream(request);
			let response = '';
			for await (const item of streamingResp.stream) {
				response += item.candidates[0].content.parts[0].text;
			}

			const inputCost = prompt.length * this.getInputCostPerToken();
			const outputCost = response.length * this.getOutputCostPerToken();
			const cost = inputCost + outputCost;
			console.log(this.model, 'input', prompt.length, 'output', response.length);
			span.setAttributes({
				inputChars: prompt.length,
				outputChars: response.length,
				response,
				inputCost,
				outputCost,
				cost,
			});
			addCost(cost);

			return response;
		});
	}

	/*
	generateTextExpectingFunctions(userPrompt: string, systemPrompt?: string): Promise<FunctionResponse> {
		console.log(this.model, 'generateTextExpectingFunctions ========================')
		return withSpan('generateText', async (span) => {
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
	*/
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
