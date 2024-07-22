// import '#fastify/trace-init/trace-init'; // leave an empty line next so this doesn't get sorted from the first line

// import { readFileSync } from 'fs';
// import { Span } from '@opentelemetry/api';
// import { LlmFunctions } from '#agent/LlmFunctions';
// import { AgentContext, AgentLLMs, agentContextStorage, createContext } from '#agent/agentContext';
// import { RunAgentConfig } from '#agent/xmlAgentRunner';
// import { FileSystem } from '#functions/storage/filesystem';
// import { GEMINI_1_5_PRO_LLMS, Gemini_1_5_Pro } from '#llm/models/vertexai';
// import { withActiveSpan } from '#o11y/trace';
//
// import { SWEBenchAgent, SWEInstance } from '#swe/SWEBenchAgent';
// import { currentUser } from '#user/userService/userContext';
// import { envVarHumanInLoopSettings } from './cliHumanInLoop';
//
// // Used to test the local repo editing workflow in CodeEditingAgent
//
// // Usage:
// // npm run code
//
// async function main() {
// 	const gemini = Gemini_1_5_Pro();
// 	const llms: AgentLLMs = GEMINI_1_5_PRO_LLMS();
//
// 	const initialPrompt = readFileSync('src/cli/swebench.json', 'utf-8');
//
// 	const task = JSON.parse(initialPrompt) as SWEInstance;
// 	console.log(task.text);
// 	if (console) return;
//
// 	const functions = new LlmFunctions();
// 	functions.addFunctionClass(FileSystem);
//
// 	const config: RunAgentConfig = {
// 		agentName: 'SWE-bench',
// 		llms,
// 		functions,
// 		user: currentUser(),
// 		initialPrompt,
// 		humanInLoop: envVarHumanInLoopSettings(),
// 	};
// 	const context: AgentContext = createContext(config);
// 	agentContextStorage.enterWith(context);
//
// 	await withActiveSpan('SWE-bench', async (span: Span) => {
// 		span.setAttributes({
// 			initialPrompt,
// 		});
// 		// await new SWEBenchAgent().runInference(initialPrompt);
// 	});
// }
//
// main().then(
// 	() => console.log('done'),
// 	(e) => console.error(e),
// );
