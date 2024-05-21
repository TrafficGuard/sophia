import { readFileSync } from 'fs';
import { AgentLLMs, agentContextStorage, getFileSystem } from '#agent/agentContext';
import { RunAgentConfig, runAgent, startAgent } from '#agent/agentRunner';
import { getHumanInLoopSettings } from '#agent/humanInLoop';
import { Toolbox } from '#agent/toolbox';
import '#fastify/trace-init/trace-init';
import { PUBLIC_WEB } from '#functions/web/web';
import { ClaudeLLMs } from '#llm/models/anthropic';
import { Claude3_Opus } from '#llm/models/anthropic';
import { ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { Claude3_Haiku_Vertex, Claude3_Sonnet_Vertex } from '#llm/models/anthropic-vertex';
import { fireworksLlama3_70B } from '#llm/models/fireworks';
import { GroqLLM, grokLLMs, groqMixtral8x7b } from '#llm/models/groq';
import { GPT4 } from '#llm/models/openai';
import { togetherLlama3_70B } from '#llm/models/together';
import { Gemini_1_5_Pro } from '#llm/models/vertexai';
import { MultiLLM } from '#llm/multi-llm';
import { appContext } from '../app';

import { currentUser } from '#user/userService/userContext';

// Usage:
// npm run research
const gemini = Gemini_1_5_Pro();

// const opus = Claude3_Opus();
const sonnet = Claude3_Sonnet_Vertex();
const groqMixtral = groqMixtral8x7b();
let llama3 = togetherLlama3_70B();
llama3 = fireworksLlama3_70B();

const llms: AgentLLMs = {
	easy: sonnet,
	medium: sonnet,
	hard: sonnet,
	xhard: new MultiLLM([/*opus,*/ GPT4(), Gemini_1_5_Pro()], 3),
};

export async function main() {
	const systemPrompt = readFileSync('src/test/research-system', 'utf-8');
	const initialPrompt = readFileSync('src/test/research-in', 'utf-8'); //'Complete the JIRA issue: ABC-123'

	const toolbox = new Toolbox();
	// toolbox.addTool('Jira', new Jira());
	// toolbox.addTool('GoogleCloud', new GoogleCloud());
	// toolbox.addTool('UtilFunctions', new UtilFunctions());
	// toolbox.addTool(getFileSystem(), 'FileSystem');
	// toolbox.addTool(new NpmPackages(), 'NpmPackages');
	toolbox.addTool(PUBLIC_WEB, 'PublicWeb');
	// toolbox.addToolType(WebResearcher);

	const config: RunAgentConfig = {
		agentName: 'researcher',
		user: currentUser(),
		initialPrompt,
		systemPrompt,
		toolbox,
		humanInLoop: getHumanInLoopSettings(),
		llms,
	};
	await startAgent(config);
}

main()
	.then(() => console.log('done'))
	.catch((e) => console.error(e));
