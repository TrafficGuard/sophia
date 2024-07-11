import { readFileSync } from 'fs';
import { AgentLLMs } from '#agent/agentContext';
import { RunAgentConfig, runAgent, startAgent } from '#agent/xmlAgentRunner';
import '#fastify/trace-init/trace-init';
import { Perplexity } from '#functions/web/perplexity';
import { PublicWeb } from '#functions/web/web';
import { ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { fireworksLlama3_70B } from '#llm/models/fireworks';
import { GroqLLM, grokLLMs, groqMixtral8x7b } from '#llm/models/groq';
import { togetherLlama3_70B } from '#llm/models/together';

// Usage:
// npm run research

const groqMixtral = groqMixtral8x7b();
let llama3 = togetherLlama3_70B();
llama3 = fireworksLlama3_70B();

const llms: AgentLLMs = ClaudeVertexLLMs();

export async function main() {
	const systemPrompt = readFileSync('src/cli/research-system', 'utf-8');
	const initialPrompt = readFileSync('src/cli/research-in', 'utf-8'); //'Complete the JIRA issue: ABC-123'

	const config: RunAgentConfig = {
		agentName: 'researcher',
		initialPrompt,
		systemPrompt,
		functions: [Perplexity, PublicWeb],
		llms,
	};
	await startAgent(config);
}

main()
	.then(() => console.log('done'))
	.catch((e) => console.error(e));
