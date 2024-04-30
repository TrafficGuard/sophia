import { getFileSystem, llms } from '#agent/agentContext';
import { logger } from '#o11y/logger';
import { LanguageTools } from './lang/languageTools';
import { TypescriptTools } from './nodejs/typescriptTools';
import { PhpTools } from './php/phpTools';
import { PythonTools } from './python/pythonTools';
import { TerraformTools } from './terraform/terraformTools';

interface ProjectDetections {
	projects: ProjectDetection[];
}

type LanguageRuntime = 'nodejs' | 'php' | 'python' | 'terraform' | 'pulumi' | 'angular';

interface ProjectDetection {
	baseDir: string;
	language: LanguageRuntime;
	files: string[];
}

export interface ProjectInfo {
	baseDir: string;
	language: LanguageRuntime | '';
	initialise: string;
	compile: string;
	format: string;
	staticAnalysis: string;
	test: string;
	languageTools: LanguageTools | null;
}

/**
 * Determines the language/runtime, base folder and key commands for a project on the filesystem.
 * Loads from the file projectInfo.json if it exists
 */
export async function detectProjectInfo(): Promise<ProjectInfo[]> {
	const fileSystem = getFileSystem();
	if (await fileSystem.fileExists('projectInfo.json')) {
		const projectInfoJson = await fileSystem.getFileContents('projectInfo.json');
		// TODO check projectInfo matches the format we expect
		try {
			let projectInfos = JSON.parse(projectInfoJson) as ProjectInfo[];
			if (!Array.isArray(projectInfos)) throw new Error('projectInfo.json should be a JSON array');
			projectInfos = projectInfos.map((info) => {
				// @ts-ignore
				if (info.languageTools === 'typescript') {
					info.languageTools = new TypescriptTools();
				}
				return info;
			});
			return projectInfos;
		} catch (e) {
			logger.warn(e, 'Error loading projectInfo.json');
		}
	}
	const files: string[] = await fileSystem.listFilesRecursively('./');
	const prompt = `<task_requirements>
<task_input>
${files.join('\n')}
</task_input>
You task it to detect key information (language/runtime and build/test commands) for a software project from the names of the files contained within it. 

For the "files" return value you will select the file names of only a few key files (documentation, project configuration, and optionally a select few entrypoint files) that will be later read and analysed to determine the commands. Do not include lock files for 3rd party code such as package-lock.json

You must respond only in JSON format matching the ProjectDetection interface in following TypeScript definitions:

interface ProjectDetections {
  /** The folder which contains all the project configuration files (eg. package.json for node.js, pom.xml for Java). Often the root folder ("./") but not always */
  baseDir: string;
  /** The programming language of the project */
  language: 'java' | 'nodejs' | 'csharp' | 'ruby' | 'python';
  /** The files to read to determine the shell commands to compile, run lint/formating and test the code. Do not include lock files for 3rd party code such as package-lock.json */
  files: string[],
}

interface ProjectDetection {
	projects: ProjectDetections[]
}
<example>
For example, if the list of files in the repository was:
<input>
README.md
backend/.python-version
backend/requirements.txt
backend/README.md
backend/bin/compile
backend/bin/test
backend/src/index.py
backend/src/module1/module1.py
backend/src/module2/module2.py
backend/src/module3/module3.py
frontend/package.json
frontend/ts-config.json
frontend/README.md
frontend/src/index.ts
backend/src/module1/module1.ts  
backend/src/module2/module2.ts
backend/src/module3/module3.ts
</input>
Then the output would be:
<output>
{
	"projects": [{
					"baseDir": "backend",
					"language": "python",
					"files": ["README.md", "backend/bin/compile", "backend/bin/test", "backend/README.md"]
				}, {
					"baseDir": "frontend",
					"language": "nodejs",
					"files": ["README.md", "frontend/package.json", "frontend/README.md"]
				}]
}
</output>
</example>
</task_requirements>`;
	const projectDetections = (await llms().medium.generateTextAsJson(prompt)) as ProjectDetections;

	if (!projectDetections.projects.length) throw new Error(`Could not detect a software project within ${fileSystem.getWorkingDirectory()}`);

	// TODO handle more than one project in a repository
	if (projectDetections.projects.length > 1) throw new Error('Support for multiple projects in a repository has not been completed');

	const projectDetection = projectDetections.projects[0];
	const projectDetectionFiles = projectDetection.files.filter((filename) => !filename.includes('package-lock.json') && !filename.includes('yarn.lock'));
	const infoFilesContents = await fileSystem.getMultipleFileContentsAsXml(projectDetectionFiles);

	const infoResponse = await llms().medium.generateTextAsJson(`${infoFilesContents}.\n 
		Your task is to determine the shell commands to compile, lint/format, and unit test the ${projectDetection.language} project from the files provided.
		There may be multiple shell commands to chain together, eg. To lint and format the project might require "npm run prettier && npm run eslint".
		
		
Explain your reasoning, then output a Markdown JSON block, with the JSON in this format as per the ProjectDetection and ProjectDetection interfaces:
{
    projects: [
        {
            "initialise": "",
            "compile": "",
            "format": "",
            "staticAnalysis": "",
            "test"
        }
    ]
}
`);
	projectDetection.files = undefined;
	const projectInfo: ProjectInfo = {
		...projectDetection,
		...infoResponse.projects[0],
		languageTools: getLanguageTools(projectDetection.language),
	};

	logger.info('ProjectInfo %o', projectInfo);
	return [projectInfo];
}

function getLanguageTools(type: LanguageRuntime): LanguageTools {
	switch (type) {
		case 'nodejs':
		case 'pulumi':
			return new TypescriptTools();
		case 'python':
			return new PythonTools();
		case 'terraform':
			return new TerraformTools();
		case 'php':
			return new PhpTools();
		default:
			throw new Error(`No tooling support for ${type}`);
	}
}
