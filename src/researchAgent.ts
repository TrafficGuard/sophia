import { readFileSync } from 'fs';
import { AgentLLMs, agentContext, enterWithContext, getFileSystem } from '#agent/agentContext';
import { RunAgentConfig, runAgent } from '#agent/agentRunner';
import { getHumanInLoopSettings } from '#agent/humanInLoop';
import { Toolbox } from '#agent/toolbox';
import '#fastify/trace-init/trace-init';
import { ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { Claude3_Haiku_Vertex, Claude3_Sonnet_Vertex } from '#llm/models/anthropic-vertex';
import { ClaudeLLMs } from '#llm/models/claude';
import { Claude3_Opus } from '#llm/models/claude';
import { GPT4 } from '#llm/models/openai';
import { Gemini_1_0_Pro, Gemini_1_5_Pro } from '#llm/models/vertexai';
import { MultiLLM } from '#llm/multi-llm';
import { AGENT_LLMS } from './agentLLMs';
import { GoogleCloud } from './functions/google-cloud';
import { Jira } from './functions/jira';
import { GitLabServer } from './functions/scm/gitlab';
import { UtilFunctions } from './functions/util';
import { PUBLIC_WEB } from './functions/web/web';
import { WebResearcher } from './functions/web/webResearch';
import { CodeEditor } from './swe/codeEditor';
import { NpmPackages } from './swe/nodejs/researchNpmPackage';
import { TypescriptTools } from './swe/nodejs/typescriptTools';

// Usage:
// npm run research
const gemini = Gemini_1_5_Pro();

const opus = Claude3_Opus();
const sonnet = Claude3_Sonnet_Vertex();

export const llms: AgentLLMs = {
	easy: sonnet,
	medium: sonnet,
	hard: opus,
	xhard: new MultiLLM([opus, GPT4(), Gemini_1_5_Pro()], 3),
};

export async function main() {
	const systemPrompt = readFileSync('ai-system-research', 'utf-8');
	const initialPrompt = readFileSync('ai-in2', 'utf-8'); //'Complete the JIRA issue: ABC-123'

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
		initialPrompt,
		systemPrompt,
		toolbox,
		humanInLoop: getHumanInLoopSettings(),
		llms,
	};
	await runAgent(config);
}

main()
	.then(() => console.log('done'))
	.catch((e) => console.error(e));
