import '#fastify/trace-init/trace-init'; // leave an empty line next so this doesn't get sorted from the first line

import { readFileSync } from 'fs';

import { AgentLLMs } from '#agent/agentContext';
import { startAgent, startAgentAndWait } from '#agent/agentRunner';
import { Perplexity } from '#functions/web/perplexity';
import { PublicWeb } from '#functions/web/web';
import { ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { fireworksLlama3_70B } from '#llm/models/fireworks';
import { groqMixtral8x7b } from '#llm/models/groq';
import { Ollama_LLMs } from '#llm/models/ollama';
import { togetherLlama3_70B } from '#llm/models/together';
import { CliOptions, getLastRunAgentId, parseProcessArgs, saveAgentId } from './cli';

// Usage:
// npm run research

const groqMixtral = groqMixtral8x7b();
let llama3 = togetherLlama3_70B();
llama3 = fireworksLlama3_70B();

let llms: AgentLLMs = ClaudeVertexLLMs();
llms = Ollama_LLMs();

export async function main() {
	const systemPrompt = readFileSync('src/cli/research-system', 'utf-8');

	const { initialPrompt, resumeAgentId } = parseProcessArgs();

	const agentId = await startAgentAndWait({
		agentName: 'researcher',
		initialPrompt,
		systemPrompt,
		functions: [Perplexity, PublicWeb],
		llms,
		resumeAgentId,
	});

	if (agentId) {
		saveAgentId('research', agentId);
	}
}

main()
	.then(() => console.log('done'))
	.catch((e) => console.error(e));
