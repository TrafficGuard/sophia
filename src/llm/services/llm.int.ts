import { expect } from 'chai';
import { LlmMessage } from '#llm/llm';
import { Claude3_5_Haiku } from '#llm/services/anthropic';
import { Claude3_5_Haiku_Vertex } from '#llm/services/anthropic-vertex';
import { cerebrasLlama3_8b } from '#llm/services/cerebras';
import { deepinfraQwQ_32B, deepinfraQwen2_5_Coder32B } from '#llm/services/deepinfra';
import { deepseekChat } from '#llm/services/deepseek';
import { fireworksLlama3_70B } from '#llm/services/fireworks';
import { groqLlama3_3_70B } from '#llm/services/groq';
import { Ollama_Phi3 } from '#llm/services/ollama';
import { GPT4oMini } from '#llm/services/openai';
import { togetherLlama3_70B } from '#llm/services/together';
import { Gemini_1_5_Flash } from '#llm/services/vertexai';

// Skip until API keys are configured in CI
describe('LLMs', () => {
	describe('generateText2', () => {
		const SKY_MESSAGES: LlmMessage[] = [
			{
				role: 'system',
				content: 'Answer in one word.',
			},
			{
				role: 'user',
				content: 'What colour is the day sky? (Hint: starts with b)',
			},
		];

		describe('Anthropic Vertex', () => {
			const llm = Claude3_5_Haiku_Vertex();

			it('should generateText', async () => {
				const response = await llm.generateText(SKY_MESSAGES, { temperature: 0 });
				expect(response.toLowerCase()).to.include('blue');
			});
		});
	});

	describe('generateText', () => {
		const SKY_PROMPT = 'What colour is the day sky? Answer in one word. (Hint: starts with b)';

		describe('Anthropic', () => {
			const llm = Claude3_5_Haiku();

			it('should generateText', async () => {
				const response = await llm.generateText(SKY_PROMPT, { temperature: 0 });
				expect(response.toLowerCase()).to.include('blue');
			});
		});

		describe('Anthropic Vertex', () => {
			const llm = Claude3_5_Haiku_Vertex();

			it('should generateText', async () => {
				const response = await llm.generateText(SKY_PROMPT, { temperature: 0 });
				expect(response.toLowerCase()).to.include('blue');
			});
		});

		describe('Cerebras', () => {
			const llm = cerebrasLlama3_8b();

			it('should generateText', async () => {
				const response = await llm.generateText(SKY_PROMPT, { temperature: 0 });
				expect(response.toLowerCase()).to.include('blue');
			});
		});

		describe('Deepinfra', () => {
			it('Qwen2_5_Coder32B should generateText', async () => {
				const llm = deepinfraQwen2_5_Coder32B();
				const response = await llm.generateText(SKY_PROMPT, { temperature: 0 });
				expect(response.toLowerCase()).to.include('blue');
			});

			it('QwQ_32B should generateText', async () => {
				const llm = deepinfraQwQ_32B();
				const response = await llm.generateText(SKY_PROMPT, { temperature: 0 });
				expect(response.toLowerCase()).to.include('blue');
			});
		});

		describe('Deepseek', () => {
			const llm = deepseekChat();

			it('should generateText', async () => {
				const response = await llm.generateText(SKY_PROMPT, { temperature: 0 });
				expect(response.toLowerCase()).to.include('blue');
			});
		});

		describe('Fireworks', () => {
			const llm = fireworksLlama3_70B();

			it('should generateText', async () => {
				const response = await llm.generateText(SKY_PROMPT, { temperature: 0 });
				expect(response.toLowerCase()).to.include('blue');
			});
		});

		describe('Groq', () => {
			const llm = groqLlama3_3_70B();

			it('should generateText', async () => {
				const response = await llm.generateText(SKY_PROMPT, { temperature: 0 });
				expect(response.toLowerCase()).to.include('blue');
			});
		});

		describe('Ollama', () => {
			const llm = Ollama_Phi3();

			it('should generateText', async () => {
				const response = await llm.generateText(SKY_PROMPT, { temperature: 0 });
				expect(response.toLowerCase()).to.include('blue');
			});
		});

		describe('OpenAI', () => {
			const llm = GPT4oMini();

			it('should generateText', async () => {
				const response = await llm.generateText(SKY_PROMPT, { temperature: 0 });
				expect(response.toLowerCase()).to.include('blue');
			});
		});

		describe('Together', () => {
			const llm = togetherLlama3_70B();

			it('should generateText', async () => {
				const response = await llm.generateText(SKY_PROMPT, { temperature: 0 });
				expect(response.toLowerCase()).to.include('blue');
			});
		});

		describe('VertexAI', () => {
			const llm = Gemini_1_5_Flash();

			it('should generateText', async () => {
				const response = await llm.generateText(SKY_PROMPT, { temperature: 0 });
				expect(response.toLowerCase()).to.include('blue');
			});
		});
	});
});
