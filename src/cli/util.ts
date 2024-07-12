import { LlmFunctions } from '#agent/LlmFunctions';
import { AgentContext, AgentLLMs, agentContextStorage, createContext, getFileSystem, llms } from '#agent/agentContext';
import { RunAgentConfig } from '#agent/xmlAgentRunner';
import '#fastify/trace-init/trace-init';
import { FileSystem } from '#functions/filesystem';
import { Jira } from '#functions/jira';
import { GitLab } from '#functions/scm/gitlab';
import { Slack } from '#functions/slack';
import { Claude3_Opus, ClaudeLLMs } from '#llm/models/anthropic';
import { Claude3_5_Sonnet_Vertex, Claude3_Haiku_Vertex, Claude3_Sonnet_Vertex, ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { GPT4, GPT4o } from '#llm/models/openai';
import { Gemini_1_5_Pro } from '#llm/models/vertexai';
import { MultiLLM } from '#llm/multi-llm';
import { ICodeReview, loadCodeReviews } from '#swe/codeReview/codeReviewParser';
import { appContext } from '../app';

import { writeFileSync } from 'node:fs';
import { currentUser } from '#user/userService/userContext';
import { envVarHumanInLoopSettings } from './cliHumanInLoop';
import { loadPyodide } from 'pyodide';

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
	xhard: new MultiLLM([sonnet, GPT4(), Gemini_1_5_Pro()], 3),
};

async function main() {
	await appContext().userService.ensureSingleUser();
	const functions = new LlmFunctions();
	functions.addFunctionClass(FileSystem);

	// Initialize Pyodide
	console.log('Initializing Pyodide...');
	const pyodide = await loadPyodide();
	await pyodide.loadPackage('micropip');
	const micropip = pyodide.pyimport('micropip');
	await micropip.install('numpy');
	console.log('Pyodide initialized successfully');

	const config: RunAgentConfig = {
		agentName: 'util',
		llms: utilLLMs,
		functions,
		initialPrompt: '',
		humanInLoop: envVarHumanInLoopSettings(),
		pyodide,
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
