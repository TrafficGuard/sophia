import { WorkflowLLMs } from './agent/workflows';
import { Claude3_Haiku_Vertex } from './llm/models/anthropic-vertex';
import { Claude3_Opus } from './llm/models/claude';
import { GPT4 } from './llm/models/openai';
import { Gemini_1_5_Pro } from './llm/models/vertexai';
import { MultiLLM } from './llm/multi-llm';

const opus = Claude3_Opus();
export const WORKFLOW_LLMS: WorkflowLLMs = {
	// easy: Gemini_1_0_Pro(),
	// medium: Gemini_1_0_Pro(),
	easy: Claude3_Haiku_Vertex(),
	medium: Gemini_1_5_Pro(),
	hard: opus,
	xhard: new MultiLLM([opus, GPT4(), Gemini_1_5_Pro()], 2),
};
