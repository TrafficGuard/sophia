import '#fastify/trace-init/trace-init'; // leave an empty line next so this doesn't get sorted from the first line

import { writeFileSync } from 'fs';
import { agentContext, agentContextStorage, createContext } from '#agent/agentContextLocalStorage';
import { AgentContext } from '#agent/agentContextTypes';
import { defaultLLMs } from '#llm/services/defaultLlms';
import { initApplicationContext } from '../applicationContext';
import { parseProcessArgs, saveAgentId } from './cli';

// Usage:
// npm run gen

async function main() {
	const llms = defaultLLMs();
	await initApplicationContext();

	const { initialPrompt } = parseProcessArgs();

	const context: AgentContext = createContext({
		initialPrompt,
		agentName: 'gen',
		llms,
		functions: [],
	});
	agentContextStorage.enterWith(context);

	const text = await llms.medium.generateText(initialPrompt, null, { temperature: 0.5 });

	writeFileSync('src/cli/gen-out', text);

	console.log(text);
	console.log();
	console.log('Wrote output to src/cli/gen-out');
	console.log(`Cost USD$${agentContext().cost.toFixed(2)}`);

	// Save the agent ID after a successful run
	saveAgentId('gen', context.agentId);
}

main()
	.then(() => {
		console.log('done');
	})
	.catch((e) => {
		console.error(e);
	});
