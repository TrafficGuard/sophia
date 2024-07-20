import { createByModelName } from '@microsoft/tiktokenizer';
import { agentContext, getFileSystem, llms } from '#agent/agentContext';
import { FileSystem } from '#functions/storage/filesystem';
import { logger } from '#o11y/logger';
import { TypescriptTools } from '#swe/lang/nodejs/typescriptTools';
import { ProjectInfo } from './projectDetection';

export interface SelectFilesResponse {
	primaryFiles: SelectedFiles[];
	secondaryFiles: SelectedFiles[];
}

export interface SelectedFiles {
	path: string;
	reason: string;
}

export async function selectFilesToEdit(requirements: string, projectInfo: ProjectInfo): Promise<SelectFilesResponse> {
	const tools = projectInfo.languageTools;
	const repositoryMap = await getFileSystem().getFileSystemTree();
	if (tools) {
		// await tools.generateProjectMap();
	}

	const tokenizer = await createByModelName('gpt-4o');
	const fileSystemTreeTokens = tokenizer.encode(repositoryMap).length;
	logger.info(`FileSystem tree tokens: ${fileSystemTreeTokens}`);

	const prompt = `
<project_map>
${repositoryMap}
</project_map>
<requirements>${requirements}</requirements>
<task>
The end goal is to meet the requirements defined.  This will be achieved by editing the source code and configuration.
Your task is select only from files in the <project_map /> the ones which will be required to edit to fulfill the requirements.
You will select:
1. The primary files which you anticipate will need to be edited, and their corresponding test files.
2. The secondary supporting files which contain documentation and type information (interfaces, types, classes, function, consts etc) that will be required to correctly makes the changes. Include any files imported by the primary files. If the requirements reference any files relevant to the changes then include them too.

Your response MUST ONLY be a JSON object in the format of the following example:
The file paths MUST exist in the <project_map /> file_contents path attributes.
<example>
<json>
{
 "primaryFiles": [
     { "path": "/dir/file1", "exists_in_project_map": true, "reason": "file1 will be edited because..." },
     { "path": "/dir/file1.test", "exists_in_project_map": true, "reason": "file1.test is a test for /dir/file1 (only if the path exists)" },
     { "path": "/dir/file2", "exists_in_project_map": true, "reason": "file2 will be edited because..." }
 ],
 "secondaryFiles": [
     { "path": "/dir/docs.txt", "exists_in_project_map": true, "reason": "Contains relevant documentation" },
     { "path": "/dir/file3", "exists_in_project_map": true, "reason": "Contains types referenced by /dir/file1" },
     { "path": "/dir/file4", "exists_in_project_map": true, "reason": "Contains types referenced by /dir/file1 and /dir/file2" },
     { "path": "/dir/file5.txt", "exists_in_project_map": true, "reason": "Referenced in the task requirements" },
 ]
}
</json>
</example>
</task>
`;
	let selectedFiles = (await llms().medium.generateJson(prompt, null, { id: 'selectFilesToEdit' })) as SelectFilesResponse;

	selectedFiles = await removeNonExistingFiles(selectedFiles);

	selectedFiles = await removeUnrelatedFiles(requirements, selectedFiles)

	return selectedFiles;
}

export async function removeUnrelatedFiles(requirements: string, fileSelection: SelectFilesResponse): Promise<SelectFilesResponse> {
	const prompt = `
Requirements: ${requirements}

Task: Analyze the following list of files and determine if each file is related to the given requirements. 
A file is considered related if it's likely to be modified or referenced when implementing the requirements.

For each file, provide a boolean indicating if it's related and a brief explanation.

File list:
${[...fileSelection.primaryFiles, ...fileSelection.secondaryFiles]
	.map(file => `- ${file.path}: ${file.reason}`)
	.join('\n')}

Respond with a JSON object in the following format:
{
	"fileAnalysis": [
		{
			"path": "file/path",
			"isRelated": true/false,
			"explanation": "Brief explanation of why the file is related or not"
		},
		...
	]
}
`;

	const jsonResult = await llms().easy.generateJson(prompt, 'You are an expert software developer tasked with identifying relevant files for a coding task.', { temperature: 0.3 });

	const fileAnalysis = (jsonResult as any).fileAnalysis;

	const filteredPrimaryFiles = fileSelection.primaryFiles.filter(file => 
		fileAnalysis.find((analysis: any) => analysis.path === file.path && analysis.isRelated)
	);

	const filteredSecondaryFiles = fileSelection.secondaryFiles.filter(file => 
		fileAnalysis.find((analysis: any) => analysis.path === file.path && analysis.isRelated)
	);

	return {
		primaryFiles: filteredPrimaryFiles,
		secondaryFiles: filteredSecondaryFiles
	};
}


export async function removeNonExistingFiles(fileSelection: SelectFilesResponse): Promise<SelectFilesResponse> {
	const fileSystem = getFileSystem();
	const primaryFiles = fileSelection.primaryFiles;
	const secondaryFiles = fileSelection.secondaryFiles;

	// Creating an array of promises for primary file existence checks
	const primaryFileExistencePromises = primaryFiles.map(async (file) => {
		const exists = await fileSystem.fileExists(file.path);
		if (exists) {
			return file;
		}
		logger.info(`Selected file for editing "${file.path}" does not exists.`);
		return null;
	});

	// Creating an array of promises for secondary file existence checks
	const secondaryFileExistencePromises = secondaryFiles.map(async (file) => {
		const exists = await fileSystem.fileExists(file.path);
		if (exists) {
			return file;
		}
		logger.info(`Selected file for editing "${file.path}" does not exists.`);
		return null;
	});

	// Wait for all promises to resolve
	const existingPrimaryFiles = (await Promise.all(primaryFileExistencePromises)).filter((file) => file !== null);
	const existingSecondaryFiles = (await Promise.all(secondaryFileExistencePromises)).filter((file) => file !== null);

	return {
		primaryFiles: existingPrimaryFiles as SelectedFiles[],
		secondaryFiles: existingSecondaryFiles as SelectedFiles[],
	};
}
