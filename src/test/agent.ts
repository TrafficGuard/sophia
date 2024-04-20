import '#fastify/trace-init/trace-init';

import { readFileSync } from 'fs';
import { use } from 'chai';
import { AgentLLMs, enterWithContext, getFileSystem } from '#agent/agentContext';
import { RunAgentConfig, runAgent } from '#agent/agentRunner';
import { getHumanInLoopSettings } from '#agent/humanInLoop';
import { Toolbox } from '#agent/toolbox';
import { Claude3_Sonnet_Vertex } from '#llm/models/anthropic-vertex';
import { Claude3_Opus, ClaudeLLMs } from '#llm/models/claude';
import { GPT4 } from '#llm/models/openai';
import { GEMINI_1_0_PRO_LLMS, GEMINI_1_5_PRO_LLMS, Gemini_1_5_Pro } from '#llm/models/vertexai';
import { MultiLLM } from '#llm/multi-llm';
import { GoogleCloud } from '../functions/google-cloud';
import { Jira } from '../functions/jira';
import { GitLabServer } from '../functions/scm/gitlab';
import { UtilFunctions } from '../functions/util';
import { PUBLIC_WEB, PublicWeb } from '../functions/web/web';
import { WebResearcher } from '../functions/web/webResearch';
import { CodeEditor } from '../swe/codeEditor';
import { DevEditWorkflow } from '../swe/devEditWorkflow';
import { TypescriptTools } from '../swe/nodejs/typescriptTools';

// let agentLLMs: AgentLLMs;
// llms = GEMINI_1_0_PRO();
// llms = ClaudeLLMs();
// workflowLLMs = WORKFLOW_LLMS;

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
const AGENT_LLMS: AgentLLMs = {
	easy: gemini,
	medium: gemini,
	hard: opus,
	xhard: new MultiLLM([opus, GPT4(), Gemini_1_5_Pro()], 3),
};

export async function main() {
	const systemPrompt = readFileSync('src/test/agent-system', 'utf-8');
	const initialPrompt = readFileSync('src/test/agent-in', 'utf-8'); //'Complete the JIRA issue: ABC-123'

	const toolbox = new Toolbox();
	// toolbox.addToolType(Jira);
	// toolbox.addToolType(GoogleCloud);
	// toolbox.addToolType(UtilFunctions);
	// toolbox.addToolType(GitLabServer);
	// toolbox.addToolType(CodeEditor);
	// toolbox.addToolType(DevEditWorkflow);
	// toolbox.addToolType(PublicWeb);
	// toolbox.addToolType(WebResearcher);
	// toolbox.addToolType(TypescriptTools);

	const config: RunAgentConfig = {
		agentName: 'nous',
		initialPrompt,
		systemPrompt,
		toolbox,
		humanInLoop: getHumanInLoopSettings(),
		llms: AGENT_LLMS,
	};

	await runAgent(config);
}

main()
	.then(() => console.log('done'))
	.catch((e) => console.error(e));
