import { AgentLLMs } from '#agent/agentContextTypes';
import { MultiLLM } from '#llm/multi-llm';
import { Claude3_5_Haiku, Claude3_5_Sonnet } from '#llm/services/anthropic';
import { Claude3_5_Sonnet_Vertex } from '#llm/services/anthropic-vertex';
import { Gemini_2_0_Flash } from '#llm/services/vertexai';

export function defaultLLMs(): AgentLLMs {
	if (process.env.GCLOUD_PROJECT) {
		const flash = Gemini_2_0_Flash();
		const sonnet = Claude3_5_Sonnet_Vertex();
		return {
			easy: flash,
			medium: flash,
			hard: sonnet,
			xhard: sonnet,
		};
	}

	const sonnet35 = Claude3_5_Sonnet();
	return {
		easy: Claude3_5_Haiku(),
		medium: sonnet35,
		hard: sonnet35,
		xhard: new MultiLLM([sonnet35], 5),
	};
}
