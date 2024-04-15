import { readFileSync } from 'fs';
import { AgentLLMs, agentContext, enterWithContext, getFileSystem, llms } from '#agent/agentContext';
import { runAgent } from '#agent/agentRunner';
import { Toolbox } from '#agent/toolbox';
import { ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { ClaudeLLMs } from '#llm/models/claude';
import { GroqLLM, grokLLMs } from '#llm/models/groq';
import { GEMINI_1_0_PRO_LLMS } from '#llm/models/vertexai';
import { AGENT_LLMS } from './agentLLMs';
import { GoogleCloud } from './functions/google-cloud';
import { Jira } from './functions/jira';
import { GitLabServer } from './functions/scm/gitlab';
import { UtilFunctions } from './functions/util';
import { PUBLIC_WEB } from './functions/web/web';
import { WEB_RESEARCH } from './functions/web/webResearch';
import { CodeEditor } from './swe/codeEditor';
import { NpmPackages } from './swe/nodejs/researchNpmPackage';
import { TypescriptTools } from './swe/nodejs/typescriptTools';

// Usage:
// npm run research

export async function main() {
	let llms: AgentLLMs = ClaudeVertexLLMs();
	llms = AGENT_LLMS;

	enterWithContext(llms);

	const system = readFileSync('ai-system-research', 'utf-8');
	const currentPrompt = readFileSync('ai-in', 'utf-8'); //'Complete the JIRA issue: ABC-123'

	const tools = new Toolbox();
	// tools.addTool('Jira', new Jira());
	// tools.addTool('GoogleCloud', new GoogleCloud());
	// tools.addTool('UtilFunctions', new UtilFunctions());
	tools.addTool('FileSystem', getFileSystem());
	tools.addTool('NpmPackages', new NpmPackages());
	tools.addTool('PublicWeb', PUBLIC_WEB);
	tools.addTool('WebResearcher', WEB_RESEARCH);

	await runAgent('researcher', tools, currentPrompt, system);
}

main()
	.then(() => console.log('done'))
	.catch((e) => console.error(e));
