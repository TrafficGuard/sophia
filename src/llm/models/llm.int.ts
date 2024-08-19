import { expect } from 'chai';
import { Claude3_Haiku } from '#llm/models/anthropic';
import { deepseekChat } from '#llm/models/deepseek';
import { fireworksLlama3_70B } from '#llm/models/fireworks';
import { groqGemma7bIt } from '#llm/models/groq';
import { Ollama_Phi3 } from '#llm/models/ollama';
import { GPT4oMini } from '#llm/models/openai';
import { togetherLlama3_70B } from '#llm/models/together';
import { Gemini_1_5_Flash } from '#llm/models/vertexai';

describe('LLMs', () => {
	const SKY_PROMPT = 'What colour is the day sky? Answer in one word.';

	describe('Anthropic', () => {
		const llm = Claude3_Haiku();

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
		const llm = groqGemma7bIt();

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
