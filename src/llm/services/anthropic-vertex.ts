import Anthropic from '@anthropic-ai/sdk';
import { AnthropicVertex } from '@anthropic-ai/vertex-sdk';
import { addCost, agentContext } from '#agent/agentContextLocalStorage';
import { AgentLLMs } from '#agent/agentContextTypes';
import { LlmCall } from '#llm/llmCallService/llmCall';
import { logger } from '#o11y/logger';
import { withActiveSpan } from '#o11y/trace';
import { currentUser } from '#user/userService/userContext';
import { envVar } from '#utils/env-var';
import { appContext } from '../../applicationContext';
import { RetryableError, cacheRetry } from '../../cache/cacheRetry';
import { BaseLLM } from '../base-llm';
import { MaxTokensError } from '../errors';
import { GenerateTextOptions, LLM, LlmMessage } from '../llm';

type Message = Anthropic.Messages.Message;
type MessageParam = Anthropic.Messages.MessageParam;
type TextBlock = Anthropic.Messages.TextBlock;
type TextBlockParam = Anthropic.Messages.TextBlockParam;
type ImageBlockParam = Anthropic.Messages.ImageBlockParam;
type BetaBase64PDFBlock = Anthropic.Beta.BetaBase64PDFBlock;

export const ANTHROPIC_VERTEX_SERVICE = 'anthropic-vertex';

// https://cloud.google.com/vertex-ai/generative-ai/docs/partner-models/use-claude#anthropic_claude_region_availability

export function anthropicVertexLLMRegistry(): Record<string, () => LLM> {
	return {
		[`${ANTHROPIC_VERTEX_SERVICE}:claude-3-5-haiku`]: Claude3_5_Haiku_Vertex,
		[`${ANTHROPIC_VERTEX_SERVICE}:claude-3-5-sonnet`]: Claude3_5_Sonnet_Vertex,
	};
}

// Supported image types image/jpeg', 'image/png', 'image/gif' or 'image/webp'
export function Claude3_5_Sonnet_Vertex() {
	return new AnthropicVertexLLM(
		'Claude 3.5 Sonnet (Vertex)',
		'claude-3-5-sonnet-v2@20241022',
		3,
		15,
		(input: string) => (input.length * 3) / (1_000_000 * 3.5),
		(output: string) => (output.length * 15) / (1_000_000 * 3.5),
	);
}

export function Claude3_5_Haiku_Vertex() {
	return new AnthropicVertexLLM(
		'Claude 3.5 Haiku (Vertex)',
		'claude-3-5-haiku@20241022',
		1,
		5,
		(input: string) => (input.length * 0.25) / (1_000_000 * 3.5),
		(output: string) => (output.length * 1.25) / (1_000_000 * 3.5),
	);
}

// export function Claude3_Opus_Vertex() {
// 	return new AnthropicVertexLLM(
// 		'Claude 3 Opus (Vertex)',
// 		'claude-3-opus@20240229',
// 		(input: string) => (input.length * 15) / (1_000_000 * 3.5),
// 		(output: string) => (output.length * 75) / (1_000_000 * 3.5),
// 	);
// }

export function ClaudeVertexLLMs(): AgentLLMs {
	const hard = Claude3_5_Sonnet_Vertex();
	return {
		easy: Claude3_5_Haiku_Vertex(),
		medium: hard,
		hard: hard,
		xhard: hard,
	};
}

/**
 * Anthropic Claude 3 through Google Cloud Vertex
 * @see https://github.com/anthropics/anthropic-sdk-typescript/tree/main/packages/vertex-sdk
 */
class AnthropicVertexLLM extends BaseLLM {
	client: AnthropicVertex | undefined;

	constructor(
		displayName: string,
		model: string,
		private inputTokensMil: number,
		private outputTokenMil: number,
		calculateInputCost: (input: string) => number,
		calculateOutputCost: (output: string) => number,
	) {
		super(displayName, ANTHROPIC_VERTEX_SERVICE, model, 200_000, calculateInputCost, calculateOutputCost);
	}

	private api(): AnthropicVertex {
		if (!this.client) {
			this.client = new AnthropicVertex({
				projectId: currentUser().llmConfig.vertexProjectId ?? envVar('GCLOUD_PROJECT'),
				region: currentUser().llmConfig.vertexRegion || process.env.GCLOUD_CLAUDE_REGION || envVar('GCLOUD_REGION'),
			});
		}
		return this.client;
	}

	isConfigured(): boolean {
		return Boolean(currentUser().llmConfig.vertexRegion || process.env.GCLOUD_CLAUDE_REGION || process.env.GCLOUD_REGION);
	}

	protected supportsGenerateTextFromMessages(): boolean {
		return true;
	}

	// Error when
	// {"error":{"code":400,"message":"Project `1234567890` is not allowed to use Publisher Model `projects/project-id/locations/us-central1/publishers/anthropic/models/claude-3-haiku@20240307`","status":"FAILED_PRECONDITION"}}

	// Error when
	// {"error":{"code":400,"message":"Project `1234567890` is not allowed to use Publisher Model `projects/project-id/locations/us-central1/publishers/anthropic/models/claude-3-haiku@20240307`","status":"FAILED_PRECONDITION"}}
	@cacheRetry({ backOffMs: 5000 })
	async generateTextFromMessages(messages: LlmMessage[], opts?: GenerateTextOptions): Promise<string> {
		return await withActiveSpan(`generateTextFromMessages ${opts?.id ?? ''}`, async (span) => {
			const maxOutputTokens = this.model.includes('3-5') ? 8192 : 4096;

			const userMsg = messages.findLast((message) => message.role === 'user');

			span.setAttributes({
				userPrompt: userMsg.content.toString(),
				// inputChars: combinedPrompt.length,
				model: this.model,
				service: this.service,
				caller: agentContext()?.callStack.at(-1) ?? '',
			});
			if (opts?.id) span.setAttribute('id', opts.id);

			const llmCallSave: Promise<LlmCall> = appContext().llmCallService.saveRequest({
				messages,
				llmId: this.getId(),
				agentId: agentContext()?.agentId,
				callStack: this.callStack(agentContext()),
			});
			const requestTime = Date.now();

			let message: Message;
			let systemMessage: string | undefined = undefined;

			try {
				if (messages[0].role === 'system') {
					const message = messages.splice(0, 1)[0];
					// systemMessage = [{ type: 'text', text: message.content as string }];
					systemMessage = message.content.toString();
					// if(source.cache)
					// 	systemMessage[0].cacheControl = 'ephemeral'
				}

				/*
				 The Anthropic types are
				 export interface MessageParam {
				  content: string | Array<TextBlockParam | ImageBlockParam | ToolUseBlockParam | ToolResultBlockParam>;

				  role: 'user' | 'assistant';
				}
				export interface TextBlockParam {
				  text: string;

				  type: 'text';
				}
				export interface ImageBlockParam {
				  source: ImageBlockParam.Source;

				  type: 'image';
				}

				export namespace ImageBlockParam {
				  export interface Source {
					data: string;

					media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

					type: 'base64';
				  }
				}
				 */
				const anthropicMessages: MessageParam[] = messages.map((message) => {
					let content: string | Array<TextBlockParam | ImageBlockParam | BetaBase64PDFBlock>;

					if (typeof message.content === 'string') {
						if (message.cache === 'ephemeral') {
							const text: TextBlockParam = {
								type: 'text',
								text: message.content,
								cache_control: {
									type: 'ephemeral',
								},
							};
							content = [text];
						} else {
							content = message.content;
						}
					} else if (Array.isArray(message.content)) {
						content = message.content.map((part: any) => {
							if (part.type === 'text') {
								const textBlock: TextBlockParam = {
									type: 'text',
									text: part.text,
								};
								if (message.cache === 'ephemeral') {
									textBlock.cache_control = {
										type: 'ephemeral',
									};
								}
								return textBlock;
							}
							if (part.type === 'image') {
								const imageBlock: ImageBlockParam = {
									type: 'image',
									source: {
										type: 'base64',
										data: part.image.toString(),
										media_type: part.mimeType || 'image/png',
									},
								};
								if (message.cache === 'ephemeral') {
									imageBlock.cache_control = {
										type: 'ephemeral',
									};
								}
								return imageBlock;
							}
							if (part.type === 'file') {
								if (part.mimeType === 'application/pdf') {
									const pdfBlock: BetaBase64PDFBlock = {
										type: 'document',
										source: {
											type: 'base64',
											media_type: 'application/pdf',
											data: part.data,
										},
									};
									if (message.cache === 'ephemeral') {
										pdfBlock.cache_control = {
											type: 'ephemeral',
										};
									}
									return pdfBlock;
								}
								throw new Error(`Unsupported file type: ${part.type}`);
							}
						});
					} else {
						content = '[No content]';
					}

					return {
						role: message.role as 'user' | 'assistant',
						content,
					};
				});
				message = await this.api().messages.create({
					system: systemMessage,
					messages: anthropicMessages,
					model: this.model,
					max_tokens: maxOutputTokens,
					stop_sequences: opts?.stopSequences,
				});
			} catch (e) {
				if (this.isRetryableError(e)) {
					throw new RetryableError(e);
				}
				throw e;
			}

			// This started happening randomly!
			if (typeof message === 'string') {
				message = JSON.parse(message);
			}

			const errorMessage = message as any;
			if (errorMessage.type === 'error') {
				throw new Error(`${errorMessage.error.type} ${errorMessage.error.message}`);
			}

			if (!message.content.length) throw new Error(`Response Message did not have any content: ${JSON.stringify(message)}`);

			if (message.content[0].type !== 'text') throw new Error(`Message content type was not text. Was ${message.content[0].type}`);

			const responseText = (message.content[0] as TextBlock).text;

			const finishTime = Date.now();
			const timeToFirstToken = finishTime - requestTime;

			const llmCall: LlmCall = await llmCallSave;

			const inputTokens = message.usage.input_tokens;
			const outputTokens = message.usage.output_tokens;

			const inputCost = (inputTokens * this.inputTokensMil) / 1_000_000;
			const outputCost = (outputTokens * this.outputTokenMil) / 1_000_000;
			const cost = inputCost + outputCost;
			addCost(cost);

			llmCall.responseText = responseText;
			llmCall.timeToFirstToken = timeToFirstToken;
			llmCall.totalTime = finishTime - requestTime;
			llmCall.cost = cost;
			llmCall.inputTokens = inputTokens;
			llmCall.outputTokens = outputTokens;

			span.setAttributes({
				inputTokens,
				outputTokens,
				response: responseText,
				inputCost: inputCost.toFixed(4),
				outputCost: outputCost.toFixed(4),
				cost: cost.toFixed(4),
				outputChars: responseText.length,
				callStack: this.callStack(agentContext()),
			});

			try {
				// Need to re-add the system message as we sliced it off earlier
				if (systemMessage) llmCall.messages.unshift({ role: 'system', content: systemMessage });
				await appContext()?.llmCallService.saveResponse(llmCall);
			} catch (e) {
				// queue to save
				logger.error(e);
			}

			if (message.stop_reason === 'max_tokens') {
				// TODO we can replay with request with the current response appended so the LLM can complete it
				logger.error('= RESPONSE exceeded max tokens ===============================');
				logger.debug(responseText);
				throw new MaxTokensError(maxOutputTokens, responseText);
			}
			return responseText;
		});
	}

	isRetryableError(e: any) {
		if (e.status === 429 || e.status === 529) return true;
		if (e.error?.code === 429 || e.error?.code === 529) return true;
		return e.error?.error?.code === 429 || e.error?.error?.code === 529;
	}
}
