import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { join } from 'path';
import { FileSystem } from './agent/filesystem';
import { getFunctionDefinitions } from './agent/metadata';
import { WorkflowLLMs, enterWithContext, getFileSystem, workflowContext } from './agent/workflows';
import { GoogleCloud } from './functions/google-cloud';
import { GitLabServer } from './functions/scm/gitlab';
import { UtilFunctions } from './functions/util';
import { PublicWeb } from './functions/web/web';
import { WEB_RESEARCH } from './functions/web/webResearch';
import { WORKFLOW_LLMS } from './index';
import { Claude3_Haiku_Vertex, Claude3_Sonnet_Vertex, ClaudeVertexLLMs } from './llm/models/anthropic-vertex';
import { Claude3_Opus, ClaudeLLMs } from './llm/models/claude';
import { GEMINI_1_0_PRO_LLMS } from './llm/models/vertexai';
import { CodeEditor } from './swe/codeEditor';
import { DevEditWorkflow } from './swe/devEditWorkflow';
import { DevRequirementsWorkflow } from './swe/devRequirementsWorkflow';
import { NpmPackages } from './swe/nodejs/researchNpmPackage';
import { TypescriptTools } from './swe/nodejs/typescriptTools';
import { checkExecResult, execCmd, execCommand } from './utils/exec';
// import { UtilFunctions } from "./functions/util"

// For running random bits of code
// Usage:
// npm run util

async function main() {
	// const llms = ClaudeVertexLLMs();
	// const llms = ClaudeLLMs();
	enterWithContext(WORKFLOW_LLMS);

	workflowContext.getStore().fileSystem = new FileSystem();

	// const requirements = "Create unit tests using mocha and chai for the functionality in the pgFunctionCache.ts.";

	// await new DevRequirementsWorkflow().runDevRequirementsWorkflow(requirements);

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
	const result = await WEB_RESEARCH.webSearch(
		`\`\`\`TypeScript\n${code}\`\`\`\nI want to create an integration with GitHub similar to the existing one for GitLab. The key functionality is creating a new merge request in GitHub using node.js, either through git flags as in the current code, or using a module or web API calls.`,
	);
	console.log();
	console.log(result);
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
