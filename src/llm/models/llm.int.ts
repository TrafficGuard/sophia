import { expect } from 'chai';
import { LlmMessage } from '#llm/llm';
import { Claude3_Haiku } from '#llm/models/anthropic';
import { Claude3_Haiku_Vertex } from '#llm/models/anthropic-vertex';
import { cerebrasLlama3_8b } from '#llm/models/cerebras';
import { deepseekChat } from '#llm/models/deepseek';
import { fireworksLlama3_70B } from '#llm/models/fireworks';
import { groqLlama3_1_8b } from '#llm/models/groq';
import { Ollama_Phi3 } from '#llm/models/ollama';
import { GPT4oMini } from '#llm/models/openai';
import { togetherLlama3_70B } from '#llm/models/together';
import { Gemini_1_5_Flash } from '#llm/models/vertexai';

// Skip until API keys are configured in CI
describe('LLMs', () => {
	describe('generateText2', () => {
		const SKY_MESSAGES: LlmMessage[] = [
			{
				role: 'system',
				text: 'Answer in one word.',
			},
			{
				role: 'user',
				text: 'What colour is the day sky? (Hint: starts with b)',
			},
		];

		describe('Anthropic Vertex', () => {
			const llm = Claude3_Haiku_Vertex();

			it('should generateText', async () => {
				const response = await llm.generateTextFromMessages(SKY_MESSAGES, { temperature: 0 });
				expect(response.toLowerCase()).to.include('blue');
			});
		});
	});

	describe('generateText', () => {
		const SKY_PROMPT = 'What colour is the day sky? Answer in one word. (Hint: starts with b)';

		describe('Anthropic', () => {
			const llm = Claude3_Haiku();

			it('should generateText', async () => {
				const response = await llm.generateText(SKY_PROMPT, null, { temperature: 0 });
				expect(response.toLowerCase()).to.include('blue');
			});
		});

		describe('Anthropic Vertex', () => {
			const llm = Claude3_Haiku_Vertex();

			it('should generateText', async () => {
				const response = await llm.generateText(SKY_PROMPT, null, { temperature: 0 });
				expect(response.toLowerCase()).to.include('blue');
			});
		});

		describe('Cerebras', () => {
			const llm = cerebrasLlama3_8b();

			it('should generateText', async () => {
				const response = await llm.generateText(SKY_PROMPT, null, { temperature: 0 });
				expect(response.toLowerCase()).to.include('blue');
			});
		});

		describe('Deepseek', () => {
			const llm = deepseekChat();

			it('should generateText', async () => {
				const response = await llm.generateText(SKY_PROMPT, null, { temperature: 0 });
				expect(response.toLowerCase()).to.include('blue');
			});
		});

		describe('Fireworks', () => {
			const llm = fireworksLlama3_70B();

			it('should generateText', async () => {
				const response = await llm.generateText(SKY_PROMPT, null, { temperature: 0 });
				expect(response.toLowerCase()).to.include('blue');
			});
		});

		describe('Groq', () => {
			const llm = groqLlama3_1_8b();

			it('should generateText', async () => {
				const response = await llm.generateText(SKY_PROMPT, null, { temperature: 0 });
				expect(response.toLowerCase()).to.include('blue');
			});
		});

		describe('Ollama', () => {
			const llm = Ollama_Phi3();

			it('should generateText', async () => {
				const response = await llm.generateText(SKY_PROMPT, null, { temperature: 0 });
				expect(response.toLowerCase()).to.include('blue');
			});
		});

		describe('OpenAI', () => {
			const llm = GPT4oMini();

			it('should generateText', async () => {
				const response = await llm.generateText(SKY_PROMPT, null, { temperature: 0 });
				expect(response.toLowerCase()).to.include('blue');
			});
		});

		describe('Together', () => {
			const llm = togetherLlama3_70B();

			it('should generateText', async () => {
				const response = await llm.generateText(SKY_PROMPT, null, { temperature: 0 });
				expect(response.toLowerCase()).to.include('blue');
			});
		});

		describe('VertexAI', () => {
			const llm = Gemini_1_5_Flash();

			it('should generateText', async () => {
				const response = await llm.generateText(SKY_PROMPT, null, { temperature: 0 });
				expect(response.toLowerCase()).to.include('blue');
			});
		});
	});
});
