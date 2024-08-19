import { expect } from 'chai';
import { Claude3_Haiku } from '#llm/models/anthropic';

describe('LLMs', () => {
	const SKY_PROMPT = 'What colour is the day sky? Answer in one word.';

	describe('Anthropic', () => {
		const llm = Claude3_Haiku();

		it('should generateText', async () => {
			const response = await llm.generateText(SKY_PROMPT, null, { temperature: 0 });
			expect(response.toLowerCase()).to.include('blue');
		});
	});
});
