import { logger } from '#o11y/logger';
import { BaseLLM } from '../base-llm';
import { GenerateTextOptions, LLM, LlmMessage } from '../llm';
import { fireworksDeepSeekR1 } from '../services/fireworks';

import { togetherDeepSeekR1 } from '#llm/services/together';

export function deepSeekFallbackRegistry(): Record<string, () => LLM> {
	return {
		DeepSeekFallback: DeepSeekR1_Together_Fireworks,
	};
}

export function DeepSeekR1_Together_Fireworks(): LLM {
	return new DeepSeekR1_Fallbacks();
}

/**
 * LLM implementation for DeepSeek R1 which uses Together.ai and Fireworks.ai for more privacy.
 * Tries Together.ai first as is slightly cheaper, then falls back to Fireworks
 */
export class DeepSeekR1_Fallbacks extends BaseLLM {
	private together: LLM = togetherDeepSeekR1();
	private fireworks: LLM = fireworksDeepSeekR1();

	constructor() {
		super(
			'DeepSeek R1 (Together, Fireworks)',
			'DeepSeekFallback',
			'deepseek-r1-together-fireworks',
			0, // Initialized later
			() => 0,
			() => 0,
		);
	}

	protected supportsGenerateTextFromMessages(): boolean {
		return true;
	}

	async generateTextFromMessages(messages: LlmMessage[], opts?: GenerateTextOptions): Promise<string> {
		try {
			return await this.together.generateText(messages, { ...opts, maxRetries: 0 });
		} catch (e) {
			const errMsg = e.statuCode === '429' ? 'rate limited' : `error: ${e.message}`;
			logger.error(`Together DeepSeek ${errMsg}`);

			return await this.fireworks.generateText(messages, opts);
		}
	}
}
