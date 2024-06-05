import '#fastify/trace-init/trace-init';

import { readFileSync } from 'fs';
import { AgentLLMs, getFileSystem } from '#agent/agentContext';
import { RunAgentConfig, runAgent, startAgent } from '#agent/agentRunner';
import { getHumanInLoopSettings } from '#agent/humanInLoop';
import { Toolbox } from '#agent/toolbox';
import { FileSystem } from '#functions/filesystem';
import { Claude3_Opus, ClaudeLLMs } from '#llm/models/anthropic';
import { Claude3_Haiku_Vertex, Claude3_Sonnet_Vertex } from '#llm/models/anthropic-vertex';
import { GPT4 } from '#llm/models/openai';
import { GEMINI_1_5_PRO_LLMS, Gemini_1_5_Pro } from '#llm/models/vertexai';
import { MultiLLM } from '#llm/multi-llm';
import { TypescriptTools } from '#swe/lang/nodejs/typescriptTools';
import { appContext } from '../app';
import { CodeEditingWorkflow } from '../swe/codeEditingWorkflow';
import { SimpleCodeEditor } from '../swe/simpleCodeEditor';
import { SoftwareDeveloperWorkflow } from '../swe/softwareDeveloperWorkflow';

import { currentUser } from '#user/userService/userContext';

const opus = Claude3_Opus();
const sonnet = Claude3_Sonnet_Vertex();
const haiku = Claude3_Haiku_Vertex();
const gemini = Gemini_1_5_Pro();

const AGENT_LLMS: AgentLLMs = {
	easy: gemini,
	medium: sonnet,
	hard: opus,
	xhard: new MultiLLM([opus, GPT4(), Gemini_1_5_Pro()], 3),
};

export async function main() {
	const systemPrompt = readFileSync('src/cli/agent-system', 'utf-8');
	const initialPrompt = readFileSync('src/cli/agent-in', 'utf-8'); //'Complete the JIRA issue: ABC-123'

	const toolbox = new Toolbox();
	// toolbox.addToolType(Jira);
	// toolbox.addToolType(GoogleCloud);
	// toolbox.addToolType(UtilFunctions);
	// toolbox.addToolType(GitLabServer);
	// toolbox.addToolType(CodeEditor);
	// toolbox.addToolType(SimpleCodeEditor);
	toolbox.addToolType(CodeEditingWorkflow);
	toolbox.addToolType(FileSystem);
	// toolbox.addToolType(DevRequirementsWorkflow);
	// toolbox.addToolType(PublicWeb);
	// toolbox.addToolType(WebResearcher);
	// toolbox.addToolType(TypescriptTools);

	// console.log(getFunctionDefinitions(toolbox.getTools()))
	// if(console)return

	const config: RunAgentConfig = {
		agentName: '',
		initialPrompt,
		user: currentUser(),
		systemPrompt,
		toolbox,
		humanInLoop: getHumanInLoopSettings(),
		llms: AGENT_LLMS,
	};

	await startAgent(config);
}

main()
	.then(() => console.log('done'))
	.catch((e) => console.error(e));
