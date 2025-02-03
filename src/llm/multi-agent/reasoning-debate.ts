import { BaseLLM } from '#llm/base-llm';
import { GenerateTextOptions, LLM, LlmMessage, userContentText } from '#llm/llm';
import { getLLM } from '#llm/llmFactory';
import { DeepSeekR1_Together_Fireworks } from '#llm/multi-agent/deepSeekR1_Fallbacks';
import { Claude3_5_Sonnet_Vertex } from '#llm/services/anthropic-vertex';
import { deepSeekR1, deepSeekV3 } from '#llm/services/deepseek';
import { fireworksDeepSeek, fireworksDeepSeekR1 } from '#llm/services/fireworks';
import { openAIo1 } from '#llm/services/openai';
import { togetherDeepSeekR1 } from '#llm/services/together';
import { Gemini_2_0_Flash_Thinking } from '#llm/services/vertexai';
import { logger } from '#o11y/logger';

// sparse multi-agent debate https://arxiv.org/abs/2406.11776

export function MoA_reasoningLLMRegistry(): Record<string, () => LLM> {
	return {
		'MoA:R1x3': () => new ReasonerDebateLLM('R1x3', deepSeekV3, [deepSeekR1, deepSeekR1, deepSeekR1], 'MoA R1x3'),
		'MoA:R1x3-Together-Fireworks': Together_R1x3_Together_Fireworks,
		'MoA:R1x3-Together': () => Together_R1x3(),
		'MoA:Sonnet_R1,o1,Gemini_Together': TogetherMoA_Claude_Sonnet_R1x2_o1,
		'MoA:Sonnet-Claude-R1,o1,Gemini': () =>
			new ReasonerDebateLLM(
				'Sonnet-Claude-R1,o1,Gemini',
				Claude3_5_Sonnet_Vertex,
				[togetherDeepSeekR1, openAIo1, Gemini_2_0_Flash_Thinking],
				'MoA:R1,o1,Gemini',
			),
	};
}

export function Together_R1x3_Together_Fireworks(): LLM {
	return new ReasonerDebateLLM(
		'R1x3-Together-Fireworks',
		DeepSeekR1_Together_Fireworks,
		[DeepSeekR1_Together_Fireworks, DeepSeekR1_Together_Fireworks, DeepSeekR1_Together_Fireworks],
		'MoA R1x3 (Together, Fireworks)',
	);
}

export function TogetherMoA_Claude_Sonnet_R1x2_o1(): LLM {
	return new ReasonerDebateLLM(
		'Sonnet_R1,o1,Gemini_Together',
		Claude3_5_Sonnet_Vertex,
		[DeepSeekR1_Together_Fireworks, openAIo1, DeepSeekR1_Together_Fireworks],
		'MoA:Claude-R1,o1,Gemini (Together, Fireworks)',
	);
}

export function Together_R1x3(): LLM {
	return new ReasonerDebateLLM('R1x3-Together', togetherDeepSeekR1, [togetherDeepSeekR1, togetherDeepSeekR1, togetherDeepSeekR1], 'MoA R1x3 Together');
}

/**
 * Multi-agent debate (spare communication topology) implementation with simple prompts for reasoning LLMs
 * @constructor
 */
export class ReasonerDebateLLM extends BaseLLM {
	llms: LLM[];
	mediator: LLM;

	/**
	 *
	 * @param modelIds LLM model ids to use seperated by the pipe character. The first id will be used as the mediator. The remaining will be used as the initial response/debate generation.
	 * @param providedMediator
	 * @param providedDebateLLMs
	 * @param name
	 */
	constructor(modelIds = '', providedMediator?: () => LLM, providedDebateLLMs?: Array<() => LLM>, name?: string) {
		super(
			name ?? '(MoA)',
			'MoA',
			modelIds,
			128_000,
			() => 0,
			() => 0,
		);
		if (providedMediator) this.mediator = providedMediator();
		if (providedDebateLLMs) {
			this.llms = providedDebateLLMs.map((factory) => factory());
			// this.model = this.llms.map((llm) => llm.)
		}
		if (modelIds?.includes('|')) {
			this.model = modelIds;
			try {
				const parts = modelIds.split('|');
				if (parts.length > 1) {
					// Set the mediator
					this.mediator = getLLM(parts[0]);

					// Set the LLMs
					this.llms = parts.slice(1).map((llmId) => getLLM(llmId));
				} else {
					throw new Error();
				}
			} catch (e) {
				throw new Error(`Invalid model string format for MoA ${modelIds}`);
			}
		}
	}

	isConfigured(): boolean {
		return this.mediator.isConfigured() && this.llms.findIndex((llm) => !llm.isConfigured()) === -1;
	}

	getModel(): string {
		return `${this.mediator.getId()}|${this.llms.map((llm) => llm.getId()).join('|')}`;
	}

	protected supportsGenerateTextFromMessages(): boolean {
		return true;
	}

	protected async generateTextFromMessages(llmMessages: LlmMessage[], opts?: GenerateTextOptions): Promise<string> {
		const readOnlyMessages = llmMessages as ReadonlyArray<Readonly<LlmMessage>>;
		logger.info('Initial response...');
		const initialResponses: string[] = await this.generateInitialResponses(readOnlyMessages, opts);
		logger.info('Debating...');
		const debatedResponses = await this.multiAgentDebate(readOnlyMessages, initialResponses, opts);
		logger.info('Mediating response...');
		return this.mergeBestResponses(readOnlyMessages, debatedResponses);
	}

	private async generateInitialResponses(llmMessages: ReadonlyArray<Readonly<LlmMessage>>, opts?: GenerateTextOptions): Promise<string[]> {
		return Promise.all(this.llms.map((llm) => llm.generateText(llmMessages, { ...opts, temperature: 1 })));
	}

	private async multiAgentDebate(
		llmMessages: ReadonlyArray<Readonly<LlmMessage>>,
		responses: string[],
		opts?: GenerateTextOptions,
		rounds = 0,
	): Promise<string[]> {
		let debatedResponses = responses;
		const userMessage = userContentText(llmMessages[llmMessages.length - 1].content);
		for (let round = 1; round < rounds; round++) {
			logger.info(`Round ${round}...`);
			debatedResponses = await Promise.all(
				this.llms.map((llm, index) => {
					const leftNeighborIndex = (index - 1 + this.llms.length) % this.llms.length;
					const rightNeighborIndex = (index + 1) % this.llms.length;
					const newUserPrompt = `<user-message>\n${userMessage}\n</user-message>\n\n<initial-response>\n${responses[index]}\n</initial-response>\n
Following are responses generated by other assistants:\n<assistant-response-1>\n${responses[leftNeighborIndex]}\n</assistant-response-1>\n\n<assistant-response-2>\n${responses[rightNeighborIndex]}\n</assistant-response-2>\n
Use the insights from all the responses to refine and update your response to the user message.
Do not mention the multiple responses provided.
Ensure any relevant response formatting instructions are followed.`;

					const debateMessages: LlmMessage[] = [...llmMessages];
					debateMessages[debateMessages.length - 1] = { role: 'user', content: newUserPrompt };
					// const debateMessages: LlmMessage[] = [...llmMessages, { role: 'user', content: newUserPrompt }];
					return llm.generateText(debateMessages, opts);
				}),
			);
		}

		return debatedResponses;
	}

	private async mergeBestResponses(llmMessages: ReadonlyArray<Readonly<LlmMessage>>, responses: string[], systemPrompt?: string): Promise<string> {
		// TODO convert content to string
		const originalMessage = userContentText(llmMessages[llmMessages.length - 1].content);
		const mergePrompt = `<user-message>\n${originalMessage}\n</user-message>

Following are responses generated by other assistants:
${responses.map((response, index) => `<assistant-response-${index + 1}>\n${response}\n</assistant-response-${index + 1}>`).join('\n\n')}
        
Look at the <user-message> again and use the insights from all the assistant responses to provide a final response. Do not mention the multiple responses provided.
Answer directly to the original user message and ensure any relevant response formatting instructions are followed.
        `;
		const mergedMessages: LlmMessage[] = [...llmMessages];
		mergedMessages[mergedMessages.length - 1] = { role: 'user', content: mergePrompt };
		const generation = this.mediator.generateText(mergedMessages, { temperature: 0.7 });
		logger.info('Merging best response...');
		return await generation;
	}
}
