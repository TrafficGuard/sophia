import {promises as fs, writeFileSync} from "node:fs";
import path, {join} from 'path';
import { createByModelName } from '@microsoft/tiktokenizer';
import { getFileSystem, llms } from '#agent/agentContext';
import { logger } from '#o11y/logger';
import { ProjectInfo } from './projectDetection';
import {countTokens} from "#llm/tokens";
import {Summary} from "#swe/documentationBuilder";


export interface SelectFilesResponse {
	primaryFiles: SelectedFile[];
	secondaryFiles: SelectedFile[];
}

export interface SelectedFile {
	path: string;
	reason: string;
}


interface ProjectMap {
	text: string;
	tokens: number;
	description: string;
}

function roundToFirstTwoDigits(number: number): number {
	// Convert the number to its absolute value for proper digits counting
	let absNumber = Math.abs(number);

	// If the number has two or fewer digits, return it as-is
	if (absNumber < 100) {
		return number;
	}

	// Get the number of digits in the number
	const digits = Math.floor(Math.log10(absNumber)) + 1;

	// Calculate the factor to scale down and up
	const factor = Math.pow(10, digits - 2);

	// Round the number to the nearest factor
	return Math.round(number / factor) * factor;
}

/**
 *
 */
export async function generateProjectMaps(projectInfo: ProjectInfo) {
	let langProjectMap: string = '';
	if (projectInfo.languageTools) {
		langProjectMap = await projectInfo.languageTools.generateProjectMap();
		logger.info(`langProjectMap ${await countTokens(langProjectMap)}`);
		writeFileSync('doc-langProjectMap', langProjectMap)
	}

	const fileSystemTree = await getFileSystem().getFileSystemTree();
	logger.info(`fileSystemTree ${await countTokens(fileSystemTree)}`);

	// Load buildDocs summaries
	const summaries = await loadBuildDocsSummaries();

	// Generate different project maps
	const hierarchicalMap = generateHierarchicalMap(fileSystemTree, summaries);
	logger.info(`hierarchicalMap ${await countTokens(hierarchicalMap)}`);
	writeFileSync('doc-hierarchicalMap', hierarchicalMap)

	const detailedDocumentation = generateDetailedDocumentation(summaries, langProjectMap);
	logger.info(`detailedDocumentation ${await countTokens(detailedDocumentation)}`);
	writeFileSync('doc-detailedDocumentation', detailedDocumentation)

	const markdownDocumentation = generateMarkdownDocumentation(fileSystemTree, summaries, langProjectMap);
	logger.info(`markdownDocumentation ${await countTokens(markdownDocumentation)}`);
	writeFileSync('doc-markdownDocumentation', markdownDocumentation)

	const summaryFocusedOverview = generateSummaryFocusedOverview(summaries);
	logger.info(`summaryFocusedOverview ${await countTokens(summaryFocusedOverview)}`);
	writeFileSync('doc-summaryFocusedOverview', summaryFocusedOverview)

	const combined = generateCombinedMap(fileSystemTree, langProjectMap, summaries);
	logger.info(`combined ${await countTokens(combined)}`);
	writeFileSync('doc-combined', combined)

	return {
		fileSystemTree,
		langProjectMap,
		hierarchicalMap,
		detailedDocumentation,
		markdownDocumentation,
		summaryFocusedOverview
	};
}

async function loadBuildDocsSummaries(): Promise<Map<string, Summary>> {
	const summaries = new Map<string, Summary>();
	const docsDir = join('.nous', 'docs');
	const files = await getFileSystem().listFilesRecursively(docsDir);

	for (const file of files) {
		if (file.endsWith('.json')) {
			const content = await fs.readFile(join(docsDir, file), 'utf-8');
			const summary: Summary = JSON.parse(content);
			summaries.set(summary.path, summary);
		}
	}

	return summaries;
}

function generateHierarchicalMap(fileSystemTree: string, summaries: Map<string, Summary>): string {
	const lines = fileSystemTree.split('\n');
	return lines.map(line => {
		const trimmedLine = line.trim();
		const matchingSummary = Array.from(summaries.entries()).find(([path, _]) => trimmedLine.endsWith(path));
		if (matchingSummary) {
			return `${line} - ${matchingSummary[1].sentence}`;
		}
		return line;
	}).join('\n');
}

function generateDetailedDocumentation(summaries: Map<string, Summary>, langProjectMap: string): string {
	let result = '';
	for (const [path, summary] of summaries) {
		result += `File: ${path}\n`;
		result += `Summary: ${summary.paragraph}\n`;
		const typeInfo = extractTypeInfo(path, langProjectMap);
		if (typeInfo) {
			result += `Type Information:\n${typeInfo}\n`;
		}
		result += '\n';
	}
	return result;
}

function generateMarkdownDocumentation(fileSystemTree: string, summaries: Map<string, Summary>, langProjectMap: string): string {
    let markdown = '# Project Documentation\n\n';
    markdown += '## Project Structure\n\n';
    markdown += '```\n' + fileSystemTree + '\n```\n\n';

    markdown += '## File Summaries\n\n';
    const lines = fileSystemTree.split('\n');
    let currentIndentation = 0;

    for (const line of lines) {
        const path = line.trim();
        const indentation = line.length - line.trimLeft().length;
        
        if (indentation > currentIndentation) {
            markdown += '\n';
        }
        currentIndentation = indentation;

        const heading = '#'.repeat(Math.min(indentation + 3, 6)); // Limit to h6
        markdown += `${heading} ${path}\n\n`;

        const summary = summaries.get(path);
        if (summary) {
            markdown += `${summary.paragraph}\n\n`;
        }

        const fileExtension = path.split('.').pop()?.toLowerCase();
        
        if (fileExtension === 'ts') {
            const typeInfo = extractTypeInfo(path, langProjectMap);
            if (typeInfo && typeInfo.trim() !== `// Type information for ${path}`) {
                markdown += '**Type Information:**\n\n```typescript\n' + typeInfo + '\n```\n\n';
            }
        } else if (fileExtension === 'html') {
            markdown += '**Content:** HTML markup for component template\n\n';
        } else if (fileExtension === 'scss' || fileExtension === 'css') {
            markdown += '**Content:** Styles for component\n\n';
        } else if (!fileExtension) {
            markdown += '**Type:** Directory\n\n';
        } else {
            markdown += `**Type:** ${fileExtension.toUpperCase()} file\n\n`;
        }
    }

    return markdown;
}

function generateSummaryFocusedOverview(summaries: Map<string, Summary>): string {
	let overview = '';
	for (const [path, summary] of summaries) {
		overview += `${path}:\n`;
		overview += `  ${summary.sentence}\n`;
		overview += `  ${summary.paragraph}\n\n`;
	}
	return overview;
}

function extractTypeInfo(path: string, langProjectMap: string): string | null {
	// This function would parse the langProjectMap to extract type information for a specific file
	// The implementation depends on the format of langProjectMap
	// For this example, we'll just return a placeholder
	return `// Type information for ${path}`;
}


function generateFlatMap(summaries: Map<string, Summary>): string {
	return Array.from(summaries.entries())
		.map(([path, summary]) => `${path}:\n  ${summary.sentence}\n  ${summary.paragraph}`)
		.join('\n\n');
}

function generateCombinedMap(fileSystemTree: string, langProjectMap: string | undefined, summaries: Map<string, Summary>): string {
	let result = "File System Tree:\n" + fileSystemTree + "\n\n";

	if (langProjectMap) {
		result += "Language Project Map:\n" + langProjectMap + "\n\n";
	}

	result += "File and Folder Summaries:\n" + generateFlatMap(summaries);

	return result;
}


export async function selectFilesToEdit(requirements: string, projectInfo: ProjectInfo): Promise<SelectFilesResponse> {
	const tools = projectInfo.languageTools;
	const repositoryMap = await getFileSystem().getFileSystemTree();
	/** Project map generated by language/runtime tooling */
	let langProjectMap: string
	if (tools) {
		langProjectMap = await tools.generateProjectMap();
	}

	const tokenizer = await createByModelName('gpt-4o'); // TODO model specific tokenizing
	const fileSystemTreeTokens = tokenizer.encode(repositoryMap).length;
	logger.info(`FileSystem tree tokens: ${fileSystemTreeTokens}`);

	if (projectInfo.fileSelection) requirements += `\nAdditional note: ${projectInfo.fileSelection}`;

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
	let selectedFiles = (await llms().medium.generateJson(prompt, null, { id: 'selectFilesToEdit' })) as SelectFilesResponse;

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
