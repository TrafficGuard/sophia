import '#fastify/trace-init/trace-init'; // leave an empty line next so this doesn't get sorted from the first line

import { readFileSync } from 'fs';

import { AgentLLMs } from '#agent/agentContextTypes';
import { startAgentAndWait } from '#agent/agentRunner';
import { Perplexity } from '#functions/web/perplexity';
import { PublicWeb } from '#functions/web/web';
import { fireworksLlama3_70B } from '#llm/services/fireworks';

import { defaultGoogleCloudLLMs } from '#llm/services/defaultLlms';
import { Ollama_LLMs } from '#llm/services/ollama';
import { togetherLlama3_70B } from '#llm/services/together';
import { parseProcessArgs, saveAgentId } from './cli';

// Usage:
// npm run research

let llama3 = togetherLlama3_70B();
llama3 = fireworksLlama3_70B();

let llms: AgentLLMs = defaultGoogleCloudLLMs();
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
