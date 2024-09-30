import '#fastify/trace-init/trace-init'; // leave an empty line next so this doesn't get sorted from the first line

import { promises as fs, readFileSync } from 'fs';
import { AgentLLMs } from '#agent/agentContextTypes';
import { AGENT_COMPLETED_PARAM_NAME } from '#agent/agentFunctions';
import { RunAgentConfig, startAgent, startAgentAndWait } from '#agent/agentRunner';
import { runAgentWorkflow } from '#agent/agentWorkflowRunner';
import { shutdownTrace } from '#fastify/trace-init/trace-init';
import { GitLab } from '#functions/scm/gitlab';
import { FileSystemService } from '#functions/storage/fileSystemService';
import { LlmTools } from '#functions/util';
import { Perplexity } from '#functions/web/perplexity';
import { PublicWeb } from '#functions/web/web';
import { LlmCall } from '#llm/llmCallService/llmCall';
import { ClaudeLLMs } from '#llm/models/anthropic';
import { Claude3_5_Sonnet_Vertex, ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { groqLlama3_1_70B } from '#llm/models/groq';
import { Gemini_1_5_Flash } from '#llm/models/vertexai';
import { logger } from '#o11y/logger';
import { SWEBenchAgent, SWEInstance } from '#swe/SWEBenchAgent';
import { CodeEditingAgent } from '#swe/codeEditingAgent';
import { sleep } from '#utils/async-utils';
import { appContext, initFirestoreApplicationContext } from '../app';
import { parseProcessArgs, saveAgentId } from './cli';

async function main() {
	const instance = JSON.parse(readFileSync('instance.json').toString()) as SWEInstance;

	await new SWEBenchAgent().runInference(instance);

	if (!process.env.ASDF) return;
	// let args = process.argv.toSpliced(2);
	//
	// args = args.filter(arg => !arg.startsWith('-'))
	// if(!args.length) throw new Error('instanceId is required')

	let agentLlms: AgentLLMs = ClaudeLLMs();
	if (process.env.GCLOUD_PROJECT) {
		await initFirestoreApplicationContext();
		agentLlms = ClaudeVertexLLMs();
	}

	const { initialPrompt, resumeAgentId } = parseProcessArgs();

	console.log(`Prompt: ${initialPrompt}`);

	const config: RunAgentConfig = {
		agentName: `SWE-Bench ${instance.instance_id}`,
		llms: agentLlms,
		functions: [], //FileSystem,
		initialPrompt,
		resumeAgentId,
		humanInLoop: {
			budget: 4,
		},
	};

	const agentId = await runAgentWorkflow(config, async () => {
		await new CodeEditingAgent().runCodeEditWorkflow(config.initialPrompt);
	});

	if (agentId) {
		saveAgentId('swebench', agentId);
	}

	await shutdownTrace();
}

main().then(
	() => console.log('done'),
	(e) => console.error(e),
);
