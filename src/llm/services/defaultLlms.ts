import { AgentLLMs } from '#agent/agentContextTypes';
import { Claude3_5_Sonnet_Vertex } from '#llm/services/anthropic-vertex';
import { Gemini_2_0_Flash, Gemini_2_0_Flash_Thinking } from '#llm/services/vertexai';

export function defaultGoogleCloudLLMs(): AgentLLMs {
	const flash = Gemini_2_0_Flash();
	const sonnet = Claude3_5_Sonnet_Vertex();
	return {
		easy: flash,
		medium: flash,
		hard: sonnet,
		xhard: sonnet,
	};
}
