import { GoogleVertexProvider, createVertex } from '@ai-sdk/google-vertex';
import { HarmBlockThreshold, HarmCategory, SafetySetting } from '@google-cloud/vertexai';
import axios from 'axios';
import { AgentLLMs } from '#agent/agentContextTypes';
import { AiLLM } from '#llm/services/ai-llm';
import { currentUser } from '#user/userService/userContext';
import { envVar } from '#utils/env-var';
import { LLM, combinePrompts } from '../llm';
import { MultiLLM } from '../multi-llm';

export function GEMINI_1_5_PRO_LLMS(): AgentLLMs {
	const flash2 = Gemini_2_0_Flash();
	return {
		easy: flash2,
		medium: flash2,
		hard: flash2,
		xhard: new MultiLLM([flash2], 5),
	};
}

export const VERTEX_SERVICE = 'vertex';

export function vertexLLMRegistry(): Record<string, () => LLM> {
	return {
		[`${VERTEX_SERVICE}:gemini-1.5-pro`]: Gemini_1_5_Pro,
		[`${VERTEX_SERVICE}:gemini-1.5-flash`]: Gemini_1_5_Flash,
		[`${VERTEX_SERVICE}:gemini-2.0-flash-thinking`]: Gemini_2_0_Flash_Thinking,
		[`${VERTEX_SERVICE}:gemini-2.0-flash`]: Gemini_2_0_Flash,
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
export function Gemini_1_5_Pro() {
	return new VertexLLM(
		'Gemini 1.5 Pro',
		'gemini-1.5-pro',
		1_000_000,
		(input: string) => (input.length * (input.length > 128_000 * 4 ? 0.0003125 : 0.000625)) / 1000,
		(output: string) => (output.length * (output.length > 128_000 * 4 ? 0.0025 : 0.00125)) / 1000,
	);
}

export function Gemini_Experimental() {
	return new VertexLLM(
		'Gemini experimental',
		'gemini-experimental',
		1_000_000,
		(input: string) => (input.length * 0.0036) / 1000,
		(output: string) => (output.length * 0.018) / 1000,
	);
}

export function Gemini_1_5_Flash() {
	return new VertexLLM(
		'Gemini 1.5 Flash',
		'gemini-1.5-flash',
		1_000_000,
		(input: string) => (input.length * 0.000125) / 1000,
		(output: string) => (output.length * 0.000375) / 1000,
	);
}

// export function Gemini_1_5_Flash_8B() {
// 	return new VertexLLM(
// 		'Gemini 1.5 Flash 8B',
// 		'gemini-1.5-flash-8b',
// 		1_000_000,
// 		(input: string) => (input.length * 0.000125) / 1000,
// 		(output: string) => (output.length * 0.000375) / 1000,
// 	);
// }

export function Gemini_2_0_Flash() {
	return new VertexLLM(
		'Gemini 2.0 Flash Experimental',
		'gemini-2.0-flash-exp',
		1_000_000,
		(input: string) => (input.length * 0.000125) / 1000,
		(output: string) => (output.length * 0.000375) / 1000,
	);
}

export function Gemini_2_0_Flash_Thinking() {
	return new VertexLLM(
		'Gemini 2.0 Flash Thinking Experimental',
		'gemini-2.0-flash-thinking-exp-1219',
		1_000_000,
		(input: string) => (input.length * 0.000125) / 1000,
		(output: string) => (output.length * 0.000375) / 1000,
	);
}

export function Vertex_Llama3_405b() {
	return new VertexLLM(
		'Llama3 405b (Vertex)',
		'Llama3-405b-instruct-maas', // meta/llama3
		100_000,
		(input: string) => 0,
		(output: string) => 0,
	);
}

/**
 * Vertex AI models - Gemini
 */
class VertexLLM extends AiLLM<GoogleVertexProvider> {
	constructor(
		displayName: string,
		model: string,
		maxInputToken: number,
		calculateInputCost: (input: string) => number,
		calculateOutputCost: (output: string) => number,
	) {
		super(displayName, VERTEX_SERVICE, model, maxInputToken, calculateInputCost, calculateOutputCost);
	}

	protected apiKey(): string {
		return currentUser().llmConfig.vertexProjectId ?? envVar('GCLOUD_PROJECT'); //currentUser().llmConfig.vertexKey || process.env.VERTEX_API_KEY;
	}

	provider(): GoogleVertexProvider {
		this.aiProvider ??= createVertex({
			// apiKey: this.apiKey(),
			project: currentUser().llmConfig.vertexProjectId ?? envVar('GCLOUD_PROJECT'),
			location: currentUser().llmConfig.vertexRegion ?? envVar('GCLOUD_REGION'),
		});

		return this.aiProvider;
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
	const PROJECT_ID = currentUser().llmConfig.vertexProjectId ?? envVar('GCLOUD_PROJECT');
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
