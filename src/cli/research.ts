import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { AgentLLMs } from '#agent/agentContext';
import { startAgent } from '#agent/agentRunner';
import '#fastify/trace-init/trace-init';
import { Perplexity } from '#functions/web/perplexity';
import { PublicWeb } from '#functions/web/web';
import { ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { fireworksLlama3_70B } from '#llm/models/fireworks';
import { GroqLLM, grokLLMs, groqMixtral8x7b } from '#llm/models/groq';
import { Ollama_LLMs } from '#llm/models/ollama';
import { togetherLlama3_70B } from '#llm/models/together';
import { CliOptions, getLastRunAgentId, parseCliOptions, saveAgentId } from './cli';

// Usage:
// npm run research

const groqMixtral = groqMixtral8x7b();
let llama3 = togetherLlama3_70B();
llama3 = fireworksLlama3_70B();

let llms: AgentLLMs = ClaudeVertexLLMs();
llms = Ollama_LLMs();

export async function main() {
	const systemPrompt = readFileSync('src/cli/research-system', 'utf-8');

	const { initialPrompt, resumeLastRun } = parseCliOptions(process.argv.slice(2));

	console.log(`Prompt: ${initialPrompt}`);

	const lastRunAgentId = resumeLastRun ? getLastRunAgentId('research') : null;

	const agentId = await startAgent({
		agentName: 'researcher',
		initialPrompt,
		systemPrompt,
		functions: [Perplexity, PublicWeb],
		llms,
		resumeAgentId: lastRunAgentId,
	});

	if (agentId) {
		saveAgentId('research', agentId);
	}
}

main()
	.then(() => console.log('done'))
	.catch((e) => console.error(e));
