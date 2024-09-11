import { promises as fs } from 'node:fs';
import { basename, dirname, join } from 'path';
import { getFileSystem, llms } from '#agent/agentContextLocalStorage';
import { logger } from '#o11y/logger';
import { sophiaDirName } from '../appVars';

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
export async function buildDocs(): Promise<void> {
	// In the first pass we generate the summaries for the individual files
	await buildFileDocs();
	// // In the second pass we build the folder-level summaries from the bottom up
	await buildFolderDocs();
	// Generate a project-level summary from the folder summaries
	await generateTopLevelSummary();
}

// -----------------------------------------------------------------------------
//   File-level summaries
// -----------------------------------------------------------------------------

export async function buildFileDocs(): Promise<void> {
	const files: string[] = await getFileSystem().listFilesRecursively();
	const cwd = getFileSystem().getWorkingDirectory();

	const easyLlm = llms().easy;

	console.log(files);

	const docGenOperations = files
		.filter((file) => file.endsWith('.ts') && !file.endsWith('test.ts'))
		.map((file) => async () => {
			logger.info(file);
			const fileContents = await fs.readFile(file);
			try {
				const doc = (await easyLlm.generateJson(
					`
<file_contents>
${fileContents}
</file_contents>
I want you to generate two summaries for the following file. 
The first summary will be one sentence long. The second summary will be one paragraph long. Include key identifiers like exported class, interface.
Respond ONLY with JSON in the format of this example
{ 
"sentence": "One sentence summary",
"paragraph": "A single paragraph. Contains details on interesting implementation details and identifiers. Quite a few sentences long"
}
`.trim(),
				)) as Summary;
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

export async function buildFolderDocs(): Promise<void> {
	const fileSystem = getFileSystem();
	const easyLlm = llms().easy;

	const folders = await fileSystem.getAllFoldersRecursively();
	const sortedFolders = sortFoldersByDepth(folders);

	for (const folder of sortedFolders) {
		let combinedSummary: string;
		try {
			const fileSummaries: Summary[] = await getFileSummaries(folder);
			const subFolderSummaries: Summary[] = await getSubFolderSummaries(folder);

			if (!fileSummaries.length && !sortedFolders.length) continue;

			combinedSummary = combineSummaries(fileSummaries, subFolderSummaries);

			const folderSummary: Summary = await generateSummaryUsingLLM(easyLlm, combinedSummary);
			folderSummary.path = folder;
			await saveFolderSummary(folder, folderSummary);
		} catch (e) {
			logger.error(e, `Failed to generate summary for folder ${folder}`);
			logger.error(combinedSummary);
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

async function getFileSummaries(folder: string): Promise<Summary[]> {
	const fileSystem = getFileSystem();
	const files = await fileSystem.listFilesInDirectory(folder);
	const summaries: Summary[] = [];

	for (const file of files) {
		const summaryPath = join(sophiaDirName, 'docs', folder, `${file}.json`);
		logger.info(`File summary path ${summaryPath}`);
		try {
			const summaryContent = await fs.readFile(summaryPath, 'utf-8');
			summaries.push(JSON.parse(summaryContent));
		} catch (e) {
			logger.warn(`Failed to read summary for file ${file}`);
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

function combineSummaries(fileSummaries: Summary[], subFolderSummaries: Summary[]): string {
	const allSummaries = [...fileSummaries, ...subFolderSummaries];
	return allSummaries.map((summary) => `${summary.sentence}\n${summary.paragraph}`).join('\n\n');
}

async function generateSummaryUsingLLM(llm: any, combinedSummary: string): Promise<Summary> {
	const prompt = `
    Generate two summaries for the following folder based on the summaries of its contents:
    ${combinedSummary}

    Don't start the summaries with "This folder contains..." instead use more concise language like "Contains XYZ and does abc..."

    Respond only with JSON in the format of this example:
    {
      "sentence": "One sentence summary of the folder",
      "paragraph": "Contains XYZ. Two paragraph summary of the folder. Contains details on the folder's purpose and main components. Quite a few sentences long."
    }
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
	const easyLlm = llms().easy;
	const cwd = fileSystem.getWorkingDirectory();

	// Get all folder-level summaries
	const folderSummaries = await getAllFolderSummaries(cwd);

	// Combine all folder summaries
	const combinedSummary = folderSummaries.map((summary) => `${summary.path}:\n${summary.sentence}\n${summary.paragraph}`).join('\n\n');

	// Generate the top-level summary using LLM
	const topLevelSummary = await generateDetailedSummaryUsingLLM(easyLlm, combinedSummary);

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

async function generateDetailedSummaryUsingLLM(llm: any, combinedSummary: string): Promise<string> {
	const prompt = `
    Generate a comprehensive, top-level summary in Markdown format of the entire project based on the following folder summaries:
    ${combinedSummary}

    Your summary should include:
    1. An overview of the project's purpose and main components
    2. Key features and functionalities
    3. The project's structure and organization
    4. Important technologies, frameworks, or libraries used
    5. Any notable or common design patterns or architectural decisions
  `;

	return await llm.generateText(prompt);
}

async function saveTopLevelSummary(rootDir: string, summary: string): Promise<void> {
	const summaryPath = join(rootDir, sophiaDirName, 'docs', '_summary');
	await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
}
