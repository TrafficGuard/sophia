import { AgentContext, AgentLLMs, agentContextStorage, createContext, getFileSystem, llms } from '#agent/agentContext';
import { Toolbox } from '#agent/toolbox';
import { RunAgentConfig } from '#agent/xmlAgentRunner';
import '#fastify/trace-init/trace-init';
import { FileSystem } from '#functions/filesystem';
import { Jira } from '#functions/jira';
import { GitLabServer } from '#functions/scm/gitlab';
import { Slack } from '#functions/slack';
import { Claude3_Opus, ClaudeLLMs } from '#llm/models/anthropic';
import { Claude3_Haiku_Vertex, Claude3_Sonnet_Vertex, ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { GPT4, GPT4o } from '#llm/models/openai';
import { Gemini_1_5_Pro } from '#llm/models/vertexai';
import { MultiLLM } from '#llm/multi-llm';
import { ICodeReview, loadCodeReviews } from '#swe/codeReview/codeReviewParser';
import { appContext } from '../app';

import { currentUser } from '#user/userService/userContext';
import { envVarHumanInLoopSettings } from './cliHumanInLoop';

// For running random bits of code
// Usage:
// npm run util

const opus = Claude3_Opus();
const sonnet = Claude3_Sonnet_Vertex();
const gemini = Gemini_1_5_Pro();

const utilLLMs: AgentLLMs = {
	easy: gemini,
	medium: gemini,
	hard: gemini,
	xhard: new MultiLLM([opus, GPT4(), Gemini_1_5_Pro()], 3),
};

async function main() {
	await appContext().userService.ensureSingleUser();
	const toolbox = new Toolbox();
	toolbox.addToolType(FileSystem);

	const config: RunAgentConfig = {
		agentName: 'util',
		llms: utilLLMs,
		toolbox,
		user: currentUser(),
		initialPrompt: '',
		humanInLoop: envVarHumanInLoopSettings(),
	};
	const context: AgentContext = createContext(config);

	agentContextStorage.enterWith(context);

	await GPT4o().generateImage(
		'Can you create an image thats a banner for GitHub README.md page.  The product name is nous. I would like a blackish background, with the word nous in lowercase, in a font without tails',
	);
	if (console) return;
	const gitlab = new GitLabServer();
	const logs = await gitlab.getJobLogs('devops/core/bq-slots', '115534');
	// console.log(logs);
	if (console) return;
	await new Slack().sendMessage('test message');

	const fileSystem = getFileSystem();
	const result = await fileSystem.searchFilesMatchingName('perplexity');
	console.log(result);

	const jira = await new Jira().getJiraDescription('SEARCH-445');
	console.log(jira);
	// // const xml = await getFileSystem().getMultipleFileContentsAsXml(['README.md', 'bin/configure']);
	// // console.log(xml);
	//
	// const files = await fileSystem.listFilesInDirectory('src/llm/models');
	// // files = ['README.md','bin/configure']
	// const xml = await getFileSystem().getMultipleFileContentsAsXml(files);
	// console.log(xml);
	// const req = readFileSync('src/cli/util-in', 'utf8');
	// await new SimpleCodeEditor().makeChanges(req, files);

	// const requirements = "";

	// await new DevRequirementsWorkflow().runDevRequirementsWorkflow(requirements);

	// const codeReviews = await loadCodeReviews();
	// const gitlab = new GitLabServer();
	// const diffs = await gitlab.reviewMergeRequest('39', 4);
}

main()
	.then(() => {
		console.log('done');
	})
	.catch((e) => {
		console.error(e);
	});
