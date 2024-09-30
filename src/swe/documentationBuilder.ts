import { promises as fs } from 'node:fs';
import { basename, dirname, join } from 'path';
import { getFileSystem, llms } from '#agent/agentContextLocalStorage';
import { logger } from '#o11y/logger';
import { sleep } from '#utils/async-utils';
import { errorToString } from '#utils/errors';
import { sophiaDirName } from '../appVars';

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
	/** A short of the file/folder */
	short: string;
	/** A longer summary of the file/folder */
	long: string;
}

/**
 * This auto-generates documentation for a project/repository, to assist with searching in the repository.
 * This should generally be run in the root folder of a project/repository.
 * The documentation summaries are saved in a parallel directory structure under the .sophia/docs folder
 */
export async function buildSummaryDocs(
	fileFilter: (path: string) => boolean = (file) => (file.endsWith('.tf') || file.endsWith('.ts') || file.endsWith('.py')) && !file.endsWith('test.ts'),
): Promise<void> {
	logger.info('Building summary docs');
	// In the first pass we generate the summaries for the individual files
	await buildFileDocs(fileFilter);
	// // In the second pass we build the folder-level summaries from the bottom up
	await buildFolderDocs();
	// Generate a project-level summary from the folder summaries
	await generateTopLevelSummary();
}

// Utils -----------------------------------------------------------

/**
 * Returns the summary file path for a given source file path
 * @param filePath source file path
 * @returns summary file path
 */
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

	const filteredFiles: string[] = files.filter(fileFilter);

	logger.info(`Building summary file docs for ${filteredFiles.length} files matching filters`);

	const docGenOperations = filteredFiles.map((file) => async () => {
		const parentSummaries: Summary[] = [];

		const fileContents = await fs.readFile(join(cwd, file));
		try {
			let parentSummary = '';
			if (parentSummaries.length) {
				parentSummary = '<parent-summaries>';
				for (const summary of parentSummaries) {
					parentSummary += `<parent-summary path="${summary.path}">\n${summary.long}\n</parent-summary>}\n`;
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
   a) A short, terse overview capturing the keywords of the file's main purpose and key details.
   b) A longer, tersely keyworded outline highlighting:
      - Main functions, classes, or interfaces exported
      - Key algorithms or data structures implemented
      - Important dependencies or relationships with other parts of the codebase
      - Unique or noteworthy aspects of the implementation
      - This should be proportional to the length of the file. About one sentence of summary for every 100 lines of the file_contents.
      - Written in a terse keyword-heavy style without any filler words.
      
The summaries should be in a very terse, gramatically shortened writing style that is incorrect English grammer. This will be only used by LLMs for search, so we want to minimise the tokens.

Note: Avoid duplicating information from parent summaries. Focus on what's unique to this file.

<example>
When the filename is variables.tf or output.tf and just has variable declarations respond like the following. Variables which are common to all (ie. project_id, project_number, region) dont require any description.
<file_contents>
variable "project_id" {
  description = "The project id where the resources will be created"
  type        = string
}

variable "region" {
  description = "The region where all resources will be deployed"
  type        = string
}

variable "run_sa" {
  description = "Cloud Run Service Account"
  type        = string
}
</file_contents>
<response>
<json>
{
  "short": "project_id, region, run_sa",
  "long": "project_id, region, run_sa: Cloud Run Service Account",
}
</json>
</response>
</example>

<example>
When a file has terraform resources respond like this example.
<file_contents>
terraform {
  required_version = ">= 1.1.4"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.46"
    }
  }
}

resource "google_cloud_run_service" "affiliate-conversion-importer" {
  name     = "affiliate-conversion-importer"
  location = var.region
  project  = var.project_id

  template {
    spec {
      containers {
        image = "gcr.io/cloudrun/hello"
      }
      service_account_name = var.run_sa
    }
  }

  lifecycle {
    ignore_changes = [
      template
    ]
  }
}
</file_contents>
<response>
<json>
{
    "short": "Cloud run service affiliate-conversion-importer",
    "long": "Cloud run service affiliate-conversion-importer with region, project_id, run_sa vars. Ignores changes to template."
}
</json>
</response>
</example>
Note the terse values for short and long in the previous example.

Respond with JSON in this format:
{
  "short": "Key details",
  "long": "Extended details. Key points. Identifiers"
}`;

			logger.info(`Generating summary for ${file}`);
			const doc = (await easyLlm.generateJson(prompt)) as Summary;
			doc.path = file;
			logger.info(doc);
			// Save the documentation summary files in a parallel directory structure under the .sophia/docs folder
			await fs.mkdir(join(cwd, sophiaDirName, 'docs', dirname(file)), { recursive: true });
			const summaryFilePath = join(cwd, sophiaDirName, 'docs', `${file}.json`);
			logger.info(`Writing summary to ${summaryFilePath}`);
			await fs.writeFile(summaryFilePath, JSON.stringify(doc, null, 2));
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
	await sleep(2000);
}

// -----------------------------------------------------------------------------
//   Folder-level summaries
// -----------------------------------------------------------------------------

/**
 * Builds the folder level summaries bottom-up
 */
export async function buildFolderDocs(): Promise<void> {
	const fileSystem = getFileSystem();
	logger.info(`Building summary docs for ${fileSystem.getWorkingDirectory()}`);

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
	return allSummaries.map((summary) => `${summary.path}\n${summary.long}`).join('\n\n');
}

async function generateFolderSummary(llm: any, combinedSummary: string, parentSummaries: Summary[] = []): Promise<Summary> {
	let parentSummary = '';
	if (parentSummaries.length) {
		parentSummary = '<parent-summaries>\n';
		for (const summary of parentSummaries) {
			parentSummary += `<parent-summary path="${summary.path}">\n${summary.long}\n</parent-summary>\n`;
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
	const combinedSummary = folderSummaries.map((summary) => `${summary.path}:\n${summary.long}`).join('\n\n');

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
			// logger.warn(`Failed to read summary for folder ${folder}`);
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
	return repositoryOverview ? `<repository-overview>\n${repositoryOverview}\n</repository-overview>\n` : '';
}

async function getParentSummaries(folderPath: string): Promise<Summary[]> {
	// TODO should walk up to the git root folder
	const parentSummaries: Summary[] = [];
	let currentPath = dirname(folderPath);

	while (currentPath !== '.') {
		const folderName = basename(currentPath);
		const summaryPath = join(sophiaDirName, 'docs', currentPath, `_${folderName}.json`);
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

/**
 * Loads build documentation summaries from the specified directory.
 *
 * @param {boolean} [createIfNotExits=true] - If true, creates the documentation directory if it doesn't exist.
 * @returns {Promise<Map<string, Summary>>} A promise that resolves to a Map of file paths to their corresponding Summary objects.
 * @throws {Error} If there's an error listing files in the docs directory.
 *
 * @description
 * This function performs the following steps:
 * 1. Checks if the docs directory exists, creating it if necessary.
 * 2. Lists all JSON files in the docs directory recursively.
 * 3. Reads and parses each JSON file, storing the resulting Summary objects in a Map.
 *
 * @example
 * const summaries = await loadBuildDocsSummaries();
 * console.log(`Loaded ${summaries.size} summaries`);
 */
export async function loadBuildDocsSummaries(createIfNotExits = true): Promise<Map<string, Summary>> {
	const summaries = new Map<string, Summary>();
	const fileSystem = getFileSystem();
	const docsDir = join(sophiaDirName, 'docs');
	logger.info(`Load summaries from ${docsDir}`);

	try {
		const dirExists = await fileSystem.fileExists(docsDir);
		if (!dirExists && !createIfNotExits) {
			logger.warn(`The ${docsDir} directory does not exist.`);
			return summaries;
		}
		if (!dirExists) {
			await buildSummaryDocs();
		}

		const files = await fileSystem.listFilesRecursively(docsDir, false);
		logger.info(`Found ${files.length} files in ${docsDir}`);

		if (files.length === 0) {
			logger.warn(`No files found in ${docsDir}. Directory might be empty.`);
			return summaries;
		}

		for (const file of files) {
			if (file.endsWith('.json')) {
				try {
					if (await fileSystem.fileExists(file)) {
						const content = await fileSystem.readFile(file);
						const summary: Summary = JSON.parse(content);
						summaries.set(summary.path, summary);
					}
				} catch (error) {
					logger.warn(`Failed to read or parse summary file: ${file}. ${errorToString(error)}`);
				}
			}
		}
	} catch (error) {
		logger.error(`Error listing files in ${docsDir}: ${error.message}`);
		throw error;
	}

	logger.info(`Loaded ${summaries.size} summaries`);
	return summaries;
}
