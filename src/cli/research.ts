import { readFileSync } from 'fs';
import { AgentLLMs } from '#agent/agentContext';
import { startAgent } from '#agent/xmlAgentRunner';
import '#fastify/trace-init/trace-init';
import { Perplexity } from '#functions/web/perplexity';
import { PublicWeb } from '#functions/web/web';
import { ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { fireworksLlama3_70B } from '#llm/models/fireworks';
import { GroqLLM, grokLLMs, groqMixtral8x7b } from '#llm/models/groq';
import { Ollama_LLMs } from '#llm/models/ollama';
import { togetherLlama3_70B } from '#llm/models/together';

// Usage:
// npm run research

const groqMixtral = groqMixtral8x7b();
let llama3 = togetherLlama3_70B();
llama3 = fireworksLlama3_70B();

let llms: AgentLLMs = ClaudeVertexLLMs();
llms = Ollama_LLMs();

export async function main() {
	const systemPrompt = readFileSync('src/cli/research-system', 'utf-8');

	const args = process.argv.slice(2);
	const initialPrompt = args.length > 0 ? args.join(' ') : readFileSync('src/cli/research-in', 'utf-8');
	console.log(`Prompt: ${initialPrompt}`);

	await startAgent({
		agentName: 'researcher',
		initialPrompt,
		systemPrompt,
		functions: [Perplexity, PublicWeb],
		llms,
	});
}

main()
	.then(() => console.log('done'))
	.catch((e) => console.error(e));
