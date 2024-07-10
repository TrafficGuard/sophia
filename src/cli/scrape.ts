import { agentContextStorage, createContext } from '#agent/agentContext';
import { PublicWeb } from '#functions/web/web';
import { ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';

async function url2markdown(url: string) {
	console.log(`${url}\n`);
	agentContextStorage.enterWith(
		createContext({
			initialPrompt: '',
			agentName: '',
			llms: ClaudeVertexLLMs(), // Requires Google Cloud and Claude model setup
			functions: [],
		}),
	);

	return await new PublicWeb().getWebPage(url);
}

if (!process.argv[2]) {
	console.error('Pass the URL to scrape as the argument');
	process.exit(1);
}

url2markdown(process.argv[2]).then(console.log, console.error);
