import { access, existsSync, lstat, lstatSync, mkdir, readFile, readdir, stat, writeFileSync } from 'node:fs';
import path from 'path';
import { promisify } from 'util';
import { createByModelName } from '@microsoft/tiktokenizer';
import { agentContext, getFileSystem, llms } from '#agent/agentContext';
import { FileSystem } from '#functions/storage/filesystem';
import { logger } from '#o11y/logger';
import { TypescriptTools } from '#swe/lang/nodejs/typescriptTools';
import { ProjectInfo } from './projectDetection';
const fs = {
	readFile: promisify(readFile),
	stat: promisify(stat),
	readdir: promisify(readdir),
	access: promisify(access),
	mkdir: promisify(mkdir),
	lstat: promisify(lstat),
};

export interface SelectFilesResponse {
	primaryFiles: SelectedFile[];
	secondaryFiles: SelectedFile[];
}

export interface SelectedFile {
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
Your task is to select from in <project_map> the files which will be required to edit to fulfill the requirements.
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
	let selectedFiles = (await llms().easy.generateJson(prompt, null, { id: 'selectFilesToEdit' })) as SelectFilesResponse;

	selectedFiles = removeLockFiles(selectedFiles);

	selectedFiles = await removeNonExistingFiles(selectedFiles);

	selectedFiles = await removeUnrelatedFiles(requirements, selectedFiles);

	return selectedFiles;
}

function createAnalysisPrompt(requirements: string, file: SelectedFile, fileContents: string): string {
	return `
Requirements: ${requirements}

Task: Analyze the following file and determine if it is related to the given requirements. 
A file is considered related if it's likely to be modified or referenced when implementing the requirements.

File: ${file.path}
Reason for selection: ${file.reason}

File contents:
${fileContents}

Respond with a JSON object in the following format:
<json>
{
	"isRelated": true/false,
	"explanation": "Brief explanation of why the file is related or not"
}
</json>
`;
}

export async function removeUnrelatedFiles(requirements: string, fileSelection: SelectFilesResponse): Promise<SelectFilesResponse> {
	const analyzeFile = async (file: SelectedFile): Promise<{ file: SelectedFile; isRelated: boolean; explanation: string }> => {
		const fileSystem = getFileSystem();
		const fileContents = (await fs.readFile(path.join(fileSystem.getWorkingDirectory(), file.path))).toString(); // TODO access filesystem directly to avoid lots of function calls
		const prompt = createAnalysisPrompt(requirements, file, fileContents);

		const jsonResult = await llms().easy.generateJson(
			prompt,
			'You are an expert software developer tasked with identifying relevant files for a coding task.',
			{ temperature: 0.5, id: 'removeUnrelatedFiles' },
		);

		return {
			file,
			isRelated: (jsonResult as any).isRelated,
			explanation: (jsonResult as any).explanation,
		};
	};

	const allFiles = [...fileSelection.primaryFiles, ...fileSelection.secondaryFiles];
	const analysisResults = await Promise.all(allFiles.map(analyzeFile));

	const filteredPrimaryFiles = fileSelection.primaryFiles.filter((file) => {
		const result = analysisResults.find((result) => result.file.path === file.path);
		if (result && !result.isRelated) {
			logger.info(`Removed unrelated primary file: ${file.path}. Reason: ${result.explanation}`);
		}
		return result?.isRelated;
	});

	const filteredSecondaryFiles = fileSelection.secondaryFiles.filter((file) => {
		const result = analysisResults.find((result) => result.file.path === file.path);
		if (result && !result.isRelated) {
			logger.info(`Removed unrelated secondary file: ${file.path}. Reason: ${result.explanation}`);
		}
		return result?.isRelated;
	});

	return {
		primaryFiles: filteredPrimaryFiles,
		secondaryFiles: filteredSecondaryFiles,
	};
}

/**
 * Remove large files
 * @param fileSelection
 */
function removeLockFiles(fileSelection: SelectFilesResponse): SelectFilesResponse {
	fileSelection.primaryFiles = fileSelection.primaryFiles.filter((file) => !file.path.endsWith('package-lock.json'));
	fileSelection.secondaryFiles = fileSelection.secondaryFiles.filter((file) => !file.path.endsWith('package-lock.json'));
	return fileSelection;
}

export async function removeNonExistingFiles(fileSelection: SelectFilesResponse): Promise<SelectFilesResponse> {
	const fileSystem = getFileSystem();
	const primaryFiles = fileSelection.primaryFiles;
	const secondaryFiles = fileSelection.secondaryFiles;

	async function fileExists(selectedFile: SelectedFile): Promise<SelectedFile> {
		try {
			await fs.access(path.join(fileSystem.getWorkingDirectory(), selectedFile.path));
			return selectedFile;
		} catch {
			logger.info(`Selected file for editing "${selectedFile.path}" does not exists.`);
			return null;
		}
	}

	const existingPrimaryFiles = (await Promise.all(primaryFiles.map(fileExists))).filter((selected) => selected !== null);
	const existingSecondaryFiles = (await Promise.all(secondaryFiles.map(fileExists))).filter((selected) => selected !== null);

	return {
		primaryFiles: existingPrimaryFiles as SelectedFile[],
		secondaryFiles: existingSecondaryFiles as SelectedFile[],
	};
}
