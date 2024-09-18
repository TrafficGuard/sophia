import { promises as fs, readFile } from 'node:fs';
import { basename, dirname, join } from 'path';
import { getFileSystem, llms } from '#agent/agentContextLocalStorage.ts';
import { logger } from '#o11y/logger.ts';
import { sophiaDirName } from '../appVars.ts';

/**
 * This module build summary documentation for a project/repository, to assist with searching in the repository.
 * This should generally be run in the root folder of a project/repository.
 * The documentation summaries are saved in a parallel directory structure under the.sophia/docs folder
 *
 * The documentation is generated bottom-up, and takes into account the parent folder summaries available upto the repository root.
 * Given initially there isn't any folder level summaries, two passes are initially required.
 *
 * It's advisable to manually create the top level summary before running this.
 */

/** Summary documentation for a file/folder */
export interface Summary {
	/** Path to the file/folder */
	path: string;
	/** A one sentence summary of the file/folder */
	sentence: string;
	/** A paragraph long summary of the file/folder */
	paragraph: string;
}

/**
 * This auto-generates documentation for a project/repository, to assist with searching in the repository.
 * This should generally be run in the root folder of a project/repository.
 * The documentation summaries are saved in a parallel directory structure under the .sophia/docs folder
 */
export async function buildSummaryDocs(fileFilter: (path: string) => boolean = (file) => file.endsWith('.ts') && !file.endsWith('test.ts')): Promise<void> {
	// In the first pass we generate the summaries for the individual files
	await buildFileDocs(fileFilter);
	// // In the second pass we build the folder-level summaries from the bottom up
	await buildFolderDocs();
	// Generate a project-level summary from the folder summaries
	await generateTopLevelSummary();
}

// Utils -----------------------------------------------------------

function getSummaryFileName(filePath: string): string {
	const fileName = basename(filePath);
	const dirPath = dirname(filePath);
	return join(sophiaDirName, 'docs', dirPath, `${fileName}.json`);
}

// -----------------------------------------------------------------------------
//   File-level summaries
// -----------------------------------------------------------------------------

export async function buildFileDocs(fileFilter: (path: string) => boolean): Promise<void> {
	const files: string[] = await getFileSystem().listFilesRecursively();
	const cwd = getFileSystem().getWorkingDirectory();

	const easyLlm = llms().easy;

	console.log(files);

	const docGenOperations = files.filter(fileFilter).map((file) => async () => {
		const parentSummaries: Summary[] = [];

		logger.info(file);
		const fileContents = await fs.readFile(file);
		try {
			let parentSummary = '';
			if (parentSummaries.length) {
				parentSummary = '<parent-summaries>';
				for (const summary of parentSummaries) {
					parentSummary += `<parent-summary path="${summary.path}">\n${summary.paragraph}\n</parent-summary>}\n`;
				}
			}

			const prompt = `
Analyze the following file contents and parent summaries (if available):

${parentSummary}
<file_contents>
${fileContents}
</file_contents>

Task: Generate concise and informative summaries for this file to be used as an index for searching the codebase.

1. Key Questions:
   List 3-5 specific questions that this file's contents would help answer.

2. File Summary:
   Provide two summaries in JSON format:
   a) A one-sentence overview capturing the file's main purpose.
   b) A paragraph-length description highlighting:
      - Main functions, classes, or interfaces exported
      - Key algorithms or data structures implemented
      - Important dependencies or relationships with other parts of the codebase
      - Unique or noteworthy aspects of the implementation
      This should be proportional to the length of the file. About one sentence of summary for every 100 lines of the file_contents.

Note: Avoid duplicating information from parent summaries. Focus on what's unique to this file.

Respond with JSON in this format:
{
  "sentence": "Concise one-sentence summary",
  "paragraph": "Detailed paragraph summary with key points and identifiers"
}`;

			const doc = (await easyLlm.generateJson(prompt)) as Summary;
			doc.path = file;
			logger.info(doc);
			// Save the documentation summary files in a parallel directory structure under the .sophia/docs folder
			await fs.mkdir(join(cwd, sophiaDirName, 'docs', dirname(file)), { recursive: true });
			await fs.writeFile(join(cwd, sophiaDirName, 'docs', `${file}.json`), JSON.stringify(doc, null, 2));
		} catch (e) {
			logger.error(e, `Failed to write documentation for file ${file}`);
		}
	});
	const all: Promise<any>[] = [];
	// Need a way to run in parallel, but then wait and re-try if hitting quotas
	for (const op of docGenOperations) {
		await op();
		// all.push(op())
	}
	try {
		await Promise.all(all);
	} catch (e) {
		logger.error(e);
	}
	logger.info('Files done');
}

// -----------------------------------------------------------------------------
//   Folder-level summaries
// -----------------------------------------------------------------------------

/**
 * Builds the folder level summaries bottom-up
 */
export async function buildFolderDocs(): Promise<void> {
	const fileSystem = getFileSystem();
	const easyLlm = llms().easy;

	const folders = await fileSystem.getAllFoldersRecursively();
	// sorted bottom-up
	const sortedFolders = sortFoldersByDepth(folders);

	for (const folderPath of sortedFolders) {
		let filesAndSubFoldersCombinedSummary: string;
		try {
			const fileSummaries: Summary[] = await getFileSummaries(folderPath);
			const subFolderSummaries: Summary[] = await getSubFolderSummaries(folderPath);

			if (!fileSummaries.length && !sortedFolders.length) continue;

			filesAndSubFoldersCombinedSummary = combineFileAndSubFoldersSummaries(fileSummaries, subFolderSummaries);

			const parentSummaries = await getParentSummaries(folderPath);
			const folderSummary: Summary = await generateFolderSummary(easyLlm, filesAndSubFoldersCombinedSummary, parentSummaries);
			folderSummary.path = folderPath;
			await saveFolderSummary(folderPath, folderSummary);
		} catch (e) {
			logger.error(e, `Failed to generate summary for folder ${folderPath}`);
			logger.error(filesAndSubFoldersCombinedSummary);
		}
	}
}

/**
 * Sort by depth for bottom-up building of the docs
 * @param folders
 */
function sortFoldersByDepth(folders: string[]): string[] {
	return folders.sort((a, b) => b.split('/').length - a.split('/').length);
}

async function getFileSummaries(folderPath: string): Promise<Summary[]> {
	const fileSystem = getFileSystem();
	const fileNames = await fileSystem.listFilesInDirectory(folderPath);
	const summaries: Summary[] = [];

	for (const fileName of fileNames) {
		const summaryPath = getSummaryFileName(join(folderPath, fileName));
		logger.info(`File summary path ${summaryPath}`);
		try {
			const summaryContent = await fs.readFile(summaryPath, 'utf-8');
			summaries.push(JSON.parse(summaryContent));
		} catch (e) {
			logger.warn(`Failed to read summary for file ${fileName}`);
		}
	}

	return summaries;
}

async function getSubFolderSummaries(folder: string): Promise<Summary[]> {
	const fileSystem = getFileSystem();
	const subFolders = await fileSystem.listFolders(folder);
	const summaries: Summary[] = [];

	for (const subFolder of subFolders) {
		const folderName = subFolder.split('/').pop();
		const summaryPath = join('.sophia', 'docs', subFolder, `_${folderName}.json`);
		logger.info(`Folder summary path ${summaryPath}`);
		try {
			const summaryContent = await fs.readFile(summaryPath, 'utf-8');
			summaries.push(JSON.parse(summaryContent));
		} catch (e) {
			// logger.warn(`Failed to read summary for subfolder ${subFolder}`);
		}
	}

	return summaries;
}

/**
 * Formats the summaries of the files and folders into the following format:
 *
 * dir/dir2
 * paragraph summary
 *
 * dir/file1
 * paragraph summary
 *
 * @param fileSummaries
 * @param subFolderSummaries
 */
function combineFileAndSubFoldersSummaries(fileSummaries: Summary[], subFolderSummaries: Summary[]): string {
	const allSummaries = [...subFolderSummaries, ...fileSummaries];
	return allSummaries.map((summary) => `${summary.path}\n${summary.paragraph}`).join('\n\n');
}

async function generateFolderSummary(llm: any, combinedSummary: string, parentSummaries: Summary[] = []): Promise<Summary> {
	let parentSummary = '';
	if (parentSummaries.length) {
		parentSummary = '<parent-summaries>\n';
		for (const summary of parentSummaries) {
			parentSummary += `<parent-summary path="${summary.path}">\n${summary.paragraph}\n</parent-summary>\n`;
		}
		parentSummary += '</parent-summaries>\n\n';
	}

	const prompt = `
Analyze the following summaries of files and subfolders within this directory:

${parentSummary}
<summaries>
${combinedSummary}
</summaries>

Task: Generate a cohesive summary for this folder that captures its role in the larger project.

1. Key Topics:
   List 3-5 main topics or functionalities this folder addresses.

2. Folder Summary:
   Provide two summaries in JSON format:
   a) A one-sentence overview of the folder's purpose and contents.
   b) A paragraph-length description highlighting:
      - The folder's role in the project architecture
      - Main components or modules contained
      - Key functionalities implemented in this folder
      - Relationships with other parts of the codebase
      - Any patterns or principles evident in the folder's organization

Note: Focus on the folder's unique contributions. Avoid repeating information from parent summaries.

Respond with JSON in this format:
<json>
{
  "sentence": "Concise one-sentence folder summary",
  "paragraph": "Detailed paragraph summarizing the folder's contents and significance"
}
</json>
`;

	return await llm.generateJson(prompt);
}

/**
 * Saves the summaries about a folder to <cwd>/.sophia/docs/folder/_folder.json
 * @param folder
 * @param summary
 */
async function saveFolderSummary(folder: string, summary: Summary): Promise<void> {
	const folderName = basename(folder);
	const summaryPath = join('.sophia', 'docs', folder, `_${folderName}.json`);
	await fs.mkdir(dirname(summaryPath), { recursive: true });
	await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
}

// -----------------------------------------------------------------------------
//   Top-level summary
// -----------------------------------------------------------------------------

export async function generateTopLevelSummary(): Promise<string> {
	const fileSystem = getFileSystem();
	const cwd = fileSystem.getWorkingDirectory();

	// Get all folder-level summaries
	const folderSummaries = await getAllFolderSummaries(cwd);

	// Combine all folder summaries
	const combinedSummary = folderSummaries.map((summary) => `${summary.path}:\n${summary.paragraph}`).join('\n\n');

	// Generate the top-level summary using LLM
	const topLevelSummary = await llms().easy.generateText(generateDetailedSummaryPrompt(combinedSummary));

	// Save the top-level summary
	await saveTopLevelSummary(cwd, topLevelSummary);

	return topLevelSummary;
}

async function getAllFolderSummaries(rootDir: string): Promise<Summary[]> {
	const fileSystem = getFileSystem();
	const folders = await fileSystem.getAllFoldersRecursively();
	const summaries: Summary[] = [];

	for (const folder of folders) {
		const folderName = folder.split('/').pop();
		const summaryPath = join(rootDir, '.sophia', 'docs', folder, `_${folderName}.json`);
		try {
			const summaryContent = await fs.readFile(summaryPath, 'utf-8');
			summaries.push(JSON.parse(summaryContent));
		} catch (e) {
			logger.warn(`Failed to read summary for folder ${folder}`);
		}
	}

	return summaries;
}

function generateDetailedSummaryPrompt(combinedSummary: string): string {
	return `Based on the following folder summaries, create a comprehensive overview of the entire project:

${combinedSummary}

Generate a detailed Markdown summary that includes:

1. Project Overview:
   - The project's primary purpose and goals

2. Architecture and Structure:
   - High-level architecture of the project
   - Key directories and their roles
   - Main modules or components and their interactions

3. Core Functionalities:
   - List and briefly describe the main features with their location in the project

4. Technologies and Patterns:
   - Primary programming languages used
   - Key frameworks, libraries, or tools
   - Notable design patterns or architectural decisions

Ensure the summary is well-structured, using appropriate Markdown formatting for readability.
Include folder path names and file paths where applicable to help readers navigate through the project.
`;
}

async function saveTopLevelSummary(rootDir: string, summary: string): Promise<void> {
	const summaryPath = join(rootDir, sophiaDirName, 'docs', '_summary');
	await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
}

export async function getTopLevelSummary(): Promise<string> {
	try {
		return (await fs.readFile(join(sophiaDirName, 'docs', '_summary'))).toString();
	} catch (e) {
		return '';
	}
}

export async function getRepositoryOverview(): Promise<string> {
	const repositoryOverview: string = await getTopLevelSummary();
	return repositoryOverview ? '<repository-overview>\n${topLevelSummary}\n</repository-overview>\n' : '';
}

async function getParentSummaries(folderPath: string): Promise<Summary[]> {
	// TODO should walk up to the git root folder
	const parentSummaries: Summary[] = [];
	let currentPath = dirname(folderPath);

	while (currentPath !== '.') {
		const folderName = basename(currentPath);
		const summaryPath = join('.sophia', 'docs', currentPath, `_${folderName}.json`);
		try {
			const summaryContent = await fs.readFile(summaryPath, 'utf-8');
			parentSummaries.unshift(JSON.parse(summaryContent));
		} catch (e) {
			// If we can't read a summary, we've reached the top of the summarized hierarchy
			break;
		}
		currentPath = dirname(currentPath);
	}

	return parentSummaries;
}
