import { readFileSync } from 'fs';
import { runAgent } from './agent/agentRunner';
import { Toolbox } from './agent/toolbox';
import { WorkflowLLMs, enterWithContext, getFileSystem, llms, workflowContext } from './agent/workflows';
import { GoogleCloud } from './functions/google-cloud';
import { Jira } from './functions/jira';
import { GitLabServer } from './functions/scm/gitlab';
import { UtilFunctions } from './functions/util';
import { WORKFLOW_LLMS } from './index';
import { ClaudeLLMs } from './llm/models/claude';
import { GEMINI_1_0_PRO_LLMS, GEMINI_1_5_PRO_LLMS } from './llm/models/vertexai';
import { CodeEditor } from './swe/codeEditor';
import { TypescriptTools } from './swe/nodejs/typescriptTools';

// let workflowLLMs: WorkflowLLMs;
// llms = GEMINI_1_0_PRO();
// llms = ClaudeLLMs();
// workflowLLMs = WORKFLOW_LLMS;

export async function main() {
	enterWithContext(WORKFLOW_LLMS);

	const systemPrompt = readFileSync('ai-system', 'utf-8');
	const userPrompt = readFileSync('ai-in', 'utf-8'); //'Complete the JIRA issue: ABC-123'

	const tools = new Toolbox();
	tools.addTool('Jira', new Jira());
	tools.addTool('GoogleCloud', new GoogleCloud());
	tools.addTool('UtilFunctions', new UtilFunctions());
	tools.addTool('FileSystem', getFileSystem());
	tools.addTool('GitLabServer', new GitLabServer());
	tools.addTool('CodeEditor', new CodeEditor());
	tools.addTool('TypescriptTools', new TypescriptTools());

	await runAgent(tools, userPrompt, systemPrompt);
}

main()
	.then(() => console.log('done'))
	.catch((e) => console.error(e));
