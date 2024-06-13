import '#fastify/trace-init/trace-init';

import { readFileSync } from 'fs';
import { AgentLLMs, getFileSystem } from '#agent/agentContext';
import { Toolbox } from '#agent/toolbox';
import { RunAgentConfig, runAgent, startAgent } from '#agent/xmlAgentRunner';
import { FileSystem } from '#functions/filesystem';
import { Claude3_Opus, ClaudeLLMs } from '#llm/models/anthropic';
import { Claude3_Haiku_Vertex, Claude3_Sonnet_Vertex, ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { GPT4 } from '#llm/models/openai';
import { GEMINI_1_5_PRO_LLMS, Gemini_1_5_Pro } from '#llm/models/vertexai';
import { MultiLLM } from '#llm/multi-llm';
import { TypescriptTools } from '#swe/lang/nodejs/typescriptTools';
import { appContext } from '../app';
import { CodeEditingWorkflow } from '../swe/codeEditingWorkflow';
import { SimpleCodeEditor } from '../swe/simpleCodeEditor';
import { SoftwareDeveloperWorkflow } from '../swe/softwareDeveloperWorkflow';

import { GoogleCloud } from '#functions/google-cloud';
import { Jira } from '#functions/jira';
import { Perplexity } from '#functions/web/perplexity';
import { PublicWeb } from '#functions/web/web';
import { currentUser } from '#user/userService/userContext';
import { envVarHumanInLoopSettings } from './cliHumanInLoop';

const opus = Claude3_Opus();
const sonnet = Claude3_Sonnet_Vertex();
const haiku = Claude3_Haiku_Vertex();
const gemini = GEMINI_1_5_PRO_LLMS;

const AGENT_LLMS: AgentLLMs = {
	easy: haiku,
	medium: sonnet,
	hard: opus,
	xhard: new MultiLLM([opus, GPT4(), Gemini_1_5_Pro()], 3),
};

export async function main() {
	const config: RunAgentConfig = {
		agentName: 'cil-agent',
		initialPrompt: readFileSync('src/cli/agent-in', 'utf-8'),
		user: currentUser(),
		toolbox: new Toolbox(SoftwareDeveloperWorkflow, FileSystem, PublicWeb, Perplexity),
		humanInLoop: envVarHumanInLoopSettings(),
		llms: ClaudeVertexLLMs(),
	};

	await startAgent(config);
}
main().then(
	() => console.log('done'),
	(e) => console.error(e),
);
