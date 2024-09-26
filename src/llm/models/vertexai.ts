import { GenerativeModel, HarmBlockThreshold, HarmCategory, SafetySetting, VertexAI } from '@google-cloud/vertexai';
import axios from 'axios';
import { addCost, agentContext } from '#agent/agentContextLocalStorage';
import { AgentLLMs } from '#agent/agentContextTypes';
import { LlmCall } from '#llm/llmCallService/llmCall';
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
		[`${VERTEX_SERVICE}:Llama3-405b-instruct-maas`]: Vertex_Llama3_405b,
	};
}

// Text input is charged by every 1,000 characters of input (prompt) and every 1,000 characters of output (response).
// Characters are counted by UTF-8 code points and white space is excluded from the count, resulting in approximately 4 characters per token
// https://ai.google.dev/gemini-api/docs/models/gemini#token-size
// https://cloud.google.com/vertex-ai/generative-ai/pricing

// gemini-1.5-pro-latest
// gemini-1.5-pro-exp-0801
// exp-0801
export function Gemini_1_5_Pro(version = '002') {
	return new VertexLLM(
		'Gemini 1.5 Pro',
		VERTEX_SERVICE,
		`gemini-1.5-pro-${version}`,
		1_000_000,
		(input: string) => (input.length * (input.length > 128_000 * 4 ? 0.0003125 : 0.000625)) / 1000,
		(output: string) => (output.length * (output.length > 128_000 * 4 ? 0.0025 : 0.00125)) / 1000,
	);
}

export function Gemini_1_5_Experimental() {
	return new VertexLLM(
		'Gemini experimental',
		VERTEX_SERVICE,
		'gemini-experimental',
		1_000_000,
		(input: string) => (input.length * 0.0036) / 1000,
		(output: string) => (output.length * 0.018) / 1000,
	);
}

export function Gemini_1_5_Flash(version = '002') {
	return new VertexLLM(
		'Gemini 1.5 Flash',
		VERTEX_SERVICE,
		`gemini-1.5-flash-${version}`,
		1_000_000,
		(input: string) => (input.length * 0.000125) / 1000,
		(output: string) => (output.length * 0.000375) / 1000,
	);
}

// async imageToText(urlOrBytes: string | Buffer): Promise<string> {
//   return withActiveSpan('imageToText', async (span) => {
//     const generativeVisionModel = this.vertex().getGenerativeModel({
//       model: this.imageToTextModel,
//     }) as GenerativeModel;
//
//     let filePart: { fileData?: { fileUri: string; mimeType: string }; inlineData?: { data: string; mimeType: string } };
//     if (typeof urlOrBytes === 'string') {
//       filePart = {
//         fileData: {
//           fileUri: urlOrBytes,
//           mimeType: 'image/jpeg', // Adjust mime type if needed
//         },
//       };
//     } else if (Buffer.isBuffer(urlOrBytes)) {
//       filePart = {
//         inlineData: {
//           data: urlOrBytes.toString('base64'),
//           mimeType: 'image/jpeg', // Adjust mime type if needed
//         },
//       };
//     } else {
//       throw new Error('Invalid input: must be a URL string or a Buffer');
//     }
//
//     const textPart = {
//       text: 'Describe the contents of this image',
//     };
//
//     const request = {
//       contents: [
//         {
//           role: 'user',
//           parts: [filePart, textPart],
//         },
//       ],
//     };
//
//     try {
//       const response = await generativeVisionModel.generateContent(request);
//       const fullTextResponse = response.response.candidates[0].content.parts[0].text;
//
//       span.setAttributes({
//         inputType: typeof urlOrBytes === 'string' ? 'url' : 'buffer',
//         outputLength: fullTextResponse.length,
//       });
//
//       return fullTextResponse;
//     } catch (error) {
//       logger.error('Error in imageToText:', error);
//       span.recordException(error);
//       span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
//       throw error;
//     }
//   });
// }

export function Vertex_Llama3_405b() {
	return new VertexLLM(
		'Llama3 405b (Vertex)',
		VERTEX_SERVICE,
		'Llama3-405b-instruct-maas', // meta/llama3
		100_000,
		(input: string) => 0,
		(output: string) => 0,
	);
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

	async generateText(userPrompt: string, systemPrompt?: string, opts?: GenerateTextOptions): Promise<string> {
		return withActiveSpan(`generateText ${opts?.id ?? ''}`, async (span) => {
			if (systemPrompt) span.setAttribute('systemPrompt', systemPrompt);

			const promptLength = userPrompt.length + systemPrompt?.length ?? 0;

			span.setAttributes({
				userPrompt,
				inputChars: promptLength,
				model: this.model,
				service: this.service,
			});

			const llmCallSave: Promise<LlmCall> = appContext().llmCallService.saveRequest({
				userPrompt,
				systemPrompt,
				llmId: this.getId(),
				agentId: agentContext()?.agentId,
				callStack: agentContext()?.callStack.join(' > '),
			});
			const requestTime = Date.now();

			let responseText = '';
			let timeToFirstToken: number;

			if (this.model.includes('Llama')) {
				responseText = await restCall(userPrompt, systemPrompt);
				timeToFirstToken = Date.now();
			} else {
				const generativeModel = this.vertex().getGenerativeModel({
					model: this.model,
					systemInstruction: systemPrompt, //  ? { role: 'system', parts: [{ text: systemPrompt }] } : undefined
					generationConfig: {
						maxOutputTokens: 8192,
						temperature: opts?.temperature,
						topP: opts?.temperature,
						stopSequences: opts?.stopSequences,
					},
					safetySettings: SAFETY_SETTINGS,
				});

				const streamingResp = await generativeModel.generateContentStream(userPrompt);

				let timeToFirstToken = null;
				for await (const item of streamingResp.stream) {
					if (!timeToFirstToken) timeToFirstToken = Date.now() - requestTime;
					if (item.candidates[0]?.content?.parts?.length > 0) {
						responseText += item.candidates[0].content.parts[0].text;
					}
					// if(item.usageMetadata)
				}
			}

			const llmCall: LlmCall = await llmCallSave;

			const inputCost = this.calculateInputCost(userPrompt + (systemPrompt ?? ''));
			const outputCost = this.calculateOutputCost(responseText);
			const cost = inputCost + outputCost;

			const finishTime = Date.now();

			llmCall.responseText = responseText;
			llmCall.timeToFirstToken = timeToFirstToken;
			llmCall.totalTime = finishTime;

			try {
				await appContext().llmCallService.saveResponse(llmCall);
			} catch (e) {
				// queue to save
				logger.error(e);
			}

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

async function restCall(userPrompt: string, systemPrompt: string): Promise<string> {
	// Replace these placeholders with actual values
	const ACCESS_TOKEN = ''; // You can run `$(gcloud auth print-access-token)` manually to get this

	// Define the payload as an object

	const messages = [];
	// if(systemPrompt) messages.push({
	// 	"role": "system",
	// 	"content": systemPrompt
	// })
	// messages.push({
	// 	"role": "user",
	// 	"content": userPrompt
	// })
	messages.push({
		role: 'user',
		content: combinePrompts(userPrompt, systemPrompt),
	});

	const payload = {
		model: 'meta/llama3-405b-instruct-maas',
		stream: false,
		messages,
	};

	// Create the request configuration
	const config = {
		headers: {
			Authorization: `Bearer ${ACCESS_TOKEN}`,
			'Content-Type': 'application/json',
		},
	};

	const REGION = 'us-central1';
	const ENDPOINT = `${REGION}-aiplatform.googleapis.com`;
	const PROJECT_ID = 'tg-infra-dev';
	try {
		const url = `https://${ENDPOINT}/v1beta1/projects/${PROJECT_ID}/locations/${REGION}/endpoints/openapi/chat/completions`;
		const response: any = await axios.post(url, payload, config);

		console.log(typeof response);

		// response = '{"data":' + response.substring(4) + "}"
		console.log(response.data);
		// const data = JSON.parse(response).data
		const data = response.data;
		console.log(data);
		// console.log(data.choices)
		const content = data.choices[0].delta.content;
		console.log('Response:', content);
		return content;
	} catch (error) {
		console.error('Error:', error);
		throw error;
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
