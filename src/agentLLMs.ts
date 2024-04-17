import { AgentLLMs } from '#agent/agentContext';
import { Claude3_Haiku_Vertex, Claude3_Sonnet_Vertex } from '#llm/models/anthropic-vertex';
import { Claude3_Opus } from '#llm/models/claude';
import { GPT4 } from '#llm/models/openai';
import { Gemini_1_0_Pro, Gemini_1_5_Pro } from '#llm/models/vertexai';
import { MultiLLM } from '#llm/multi-llm';

const opus = Claude3_Opus();
const sonnet = Claude3_Sonnet_Vertex();
// export const AGENT_LLMS: AgentLLMs = {
// 	// easy: Gemini_1_0_Pro(),
// 	// medium: Gemini_1_0_Pro(),
// 	easy: Claude3_Haiku_Vertex(),
// 	medium: sonnet,
// 	hard: sonnet,
// 	xhard: new MultiLLM([sonnet, Gemini_1_5_Pro()], 3),
// };
const gemini = Gemini_1_5_Pro();
export const AGENT_LLMS: AgentLLMs = {
	easy: gemini,
	medium: opus,
	hard: opus,
	xhard: new MultiLLM([opus, GPT4(), Gemini_1_5_Pro()], 3),
};
