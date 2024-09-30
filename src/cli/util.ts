import '#fastify/trace-init/trace-init'; // leave an empty line next so this doesn't get sorted from the first line

import { LlmFunctions } from '#agent/LlmFunctions';
import { agentContextStorage, createContext, getFileSystem, llms } from '#agent/agentContextLocalStorage';
import { Jira } from '#functions/jira';
import { GitLab } from '#functions/scm/gitlab';

import { FileSystemService } from '#functions/storage/fileSystemService';
import { Claude3_Opus, ClaudeLLMs } from '#llm/models/anthropic';
import { Claude3_5_Sonnet_Vertex, Claude3_Haiku_Vertex, Claude3_Sonnet_Vertex, ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { GPT4o } from '#llm/models/openai';
import { Gemini_1_5_Pro } from '#llm/models/vertexai';
import { MultiLLM } from '#llm/multi-llm';
import { appContext } from '../app';

import { writeFileSync } from 'fs';
import { AgentContext, AgentLLMs } from '#agent/agentContextTypes';
import { RunAgentConfig } from '#agent/agentRunner';
import { TypescriptTools } from '#swe/lang/nodejs/typescriptTools';
import { envVarHumanInLoopSettings } from './cliHumanInLoop';

// For running random bits of code
// Usage:
// npm run util

const opus = Claude3_Opus();
const sonnet = Claude3_5_Sonnet_Vertex();
const gemini = Gemini_1_5_Pro();

const utilLLMs: AgentLLMs = {
	easy: sonnet,
	medium: sonnet,
	hard: sonnet,
	xhard: new MultiLLM([sonnet, GPT4o(), Gemini_1_5_Pro()], 3),
};

async function main() {
	await appContext().userService.ensureSingleUser();
	const functions = new LlmFunctions();
	functions.addFunctionClass(FileSystemService);

	const config: RunAgentConfig = {
		agentName: 'util',
		llms: utilLLMs,
		functions,
		initialPrompt: '',
		humanInLoop: envVarHumanInLoopSettings(),
	};

	const context: AgentContext = createContext(config);

	agentContextStorage.enterWith(context);
}

main()
	.then(() => {
		console.log('done');
	})
	.catch((e) => {
		console.error(e);
	});
