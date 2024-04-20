import { randomUUID } from 'crypto';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { DiffRefsSchema, MergeRequestDiffSchema, MergeRequestDiscussionNotePositionOptions } from '@gitbeaker/rest';
import { DOMParser } from 'xmldom';
import { AgentContext, AgentLLMs, agentContext, createContext, enterWithContext, getFileSystem, llms } from '#agent/agentContext';
import { FileSystem } from '#agent/filesystem';
import '#fastify/trace-init/trace-init';
import { Claude3_Haiku_Vertex, Claude3_Sonnet_Vertex, ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { Claude3_Opus, ClaudeLLMs } from '#llm/models/claude';
import { GPT4 } from '#llm/models/openai';
import { GEMINI_1_0_PRO_LLMS, Gemini_1_5_Pro } from '#llm/models/vertexai';
import { MultiLLM } from '#llm/multi-llm';
import { getFunctionDefinitions } from '#agent/metadata';
import { AGENT_LLMS } from '../agentLLMs';
import { GitLabServer } from '../functions/scm/gitlab';
import { PublicWeb } from '../functions/web/web';
import { ICodeReview, loadCodeReviews } from '../swe/codeReview/codeReviewParser';
import { ProjectInfo } from '../swe/projectDetection';
import { sleep } from '#utils/async-utils';
import { checkExecResult, execCmd, execCommand } from '#utils/exec';
// import { UtilFunctions } from "./functions/util"

// For running random bits of code
// Usage:
// npm run util

const opus = Claude3_Opus();
const sonnet = Claude3_Sonnet_Vertex();
const gemini = Gemini_1_5_Pro();
export const utilLLMs: AgentLLMs = {
	easy: gemini,
	medium: sonnet,
	hard: sonnet,
	xhard: new MultiLLM([opus, GPT4(), Gemini_1_5_Pro()], 3),
};

async function main() {
	const context: AgentContext = createContext('util', utilLLMs);
	agentContext.enterWith(context);
	context.toolbox.addTool(context.fileSystem, 'FileSystem');

	agentContext.getStore().fileSystem = new FileSystem();

	const xml = await getFileSystem().getMultipleFileContentsAsXml(['README.md','bin/configure']);
	console.log(xml);
	if(console)return
	// const requirements = "Create unit tests using mocha and chai for the functionality in the pgFunctionCache.ts.";

	// await new DevRequirementsWorkflow().runDevRequirementsWorkflow(requirements);


	const codeReviews = await loadCodeReviews();
	const gitlab = new GitLabServer();
	const diffs = await gitlab.reviewMergeRequest('121', 2633);

	if (console) return;

	// const page = await new PublicWeb().getWebPage('https://about.gitlab.com/blog/2023/07/06/how-to-automate-creation-of-runners/');
	//
	// console.log(page);
	// if (console) return;
	//
	// const jira = await new Jira().getJiraDescription('CLD-1282');
	// console.log(jira);

	// const projectInfo: ProjectInfo = {
	// 	languageTools: new TypescriptTools(),
	// 	compile: 'npm run build',
	// 	baseDir: './',
	// 	format: 'npm run format',
	// 	staticAnalysis: 'npm run lint',
	// 	test: 'npm run test',
	// 	language: 'nodejs',
	// 	initialise: 'nvm use && .',
	// };
	// console.log('sleeping');
	// await sleep(2000);
	// console.log('compiling');
	// const compiled = await new DevEditWorkflow().compile(projectInfo);

	// const codebase = await getFileSystem().getFileContentsRecursivelyAsXml('./src');
	// writeFileSync('codebase', codebase);

	return;
	// const map = await new TypescriptTools().getRepositoryMap();
	// console.log(map)
	// console.log(map.length)
	// generateDefinition('./src/functions/util.ts')
	// getDefinition(FileSystem.prototype)

	// await new NpmPackages().getPackageInfo('ts-jest')

	// await new WebsiteCrawler().readableVersionFromUrl("https://www.npmjs.com/package/ts-morph")

	// const page = await new WebsiteCrawler().getWebPage("https://google.github.io/styleguide/tsguide.html")
	// console.log(page)

	// const links = await new WebsiteCrawler().googleSearch('Create merge request in GitHub using node.js')
	// console.log(links)

	const code = `
	async cloneProject(projectPathWithNamespace: string): Promise<FileSystem> {
		const path = join(getFileSystem().getWorkingDirectory(), 'gitlab', projectPathWithNamespace);

		// If the project already exists pull updates
		if (existsSync(path)) {
			const result = await execCmd(\`git -C \${path} pull\`);
			checkExecResult(result, \`Failed to pull unshallow \${path}\`);
		} else {
			console.log(\`Cloning to \${path}\`);
			const command = \`git clone https://oauth2:\${this.config.token}@\${this.config.host}/\${projectPathWithNamespace}.git \${path}\`;
			const result = await execCmd(command);
			checkExecResult(result, \`Failed to clone \${projectPathWithNamespace}\`);
		}
		return new FileSystem(path);
	}


	async createMergeRequest(title: string, description: string): Promise<string> {
		// TODO lookup project details from project list
		// get main branch. If starts with feature and dev develop exists, then that
		const currentBranch = getFileSystem().vcs.getBranchName();

		const targetBranch = 'master'; // TODO get from the GitLab project

		const cmd = \`git push --set-upstream origin "\${currentBranch}" -o merge_request.create -o merge_request.target="\${targetBranch}" -o merge_request.remove_source_branch -o merge_request.title="\${title}"\`;
		const { exitCode, stdout, stderr } = await execCommand(cmd);
		if (exitCode > 0) throw new Error(\`\${stdout}\n\${stderr}\`);

		const url = await new UtilFunctions().processText(stdout, 'Respond only with the URL where the merge request is.');
		if (!URL.canParse(url)) {
			throw new Error(\`LLM did not extract MR url. Returned \${url}\`);
		}
		return url;
	}`;
	// const result = await WEB_RESEARCH.webSearch(
	// 	`\`\`\`TypeScript\n${code}\`\`\`\nI want to create an integration with GitHub similar to the existing one for GitLab. The key functionality is creating a new merge request in GitHub using node.js, either through git flags as in the current code, or using a module or web API calls.`,
	// );
	// console.log();
	// console.log(result);
	// const filesystem = new FileSystem('./src/')
	// const editor = new CodeEditor({
	//     basePath: './',
	//     filesToEdit: [],
	//     requirements: ''
	// })

	// const map = await new CodeEditor().getRepositoryMap('./src')
	// console.log(map)
	// await new WebsiteCrawler().crawl('https://ts-morph.com')

	// const jira = new Jira()
	// const gitLab = new GitLabServer({name: 'gitlab.com', host: 'https://gitlab.com/api/v4'})
	// const codeEditor = new CodeEditor()
	// const utils = new UtilFunctions()
	// const gcp = new GoogleCloud()
	//
	// console.log('==============')
	// console.log(getFunctionDefinitions(filesystem, jira, gitLab, codeEditor, utils, gcp))
	// console.log('==============')
}

main()
	.then(() => {
		console.log('done');
	})
	.catch((e) => {
		console.error(e);
	});
