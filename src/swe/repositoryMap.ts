import { getFileSystem } from '#agent/agentContextLocalStorage';
import { countTokens } from '#llm/tokens';
import { logger } from '#o11y/logger';
import { ProjectInfo } from '#swe/projectDetection';
import { errorToString } from '#utils/errors';
import { sophiaDirName } from '../appVars';
import { Summary, getTopLevelSummary } from './documentationBuilder.ts';

interface RepositoryMap {
	text: string;
	tokens?: number;
}

export interface RepositoryMaps {
	repositorySummary: string;
	fileSystemTree: RepositoryMap;
	fileSystemTreeWithSummaries: RepositoryMap;
	folderSystemTreeWithSummaries: RepositoryMap;
	languageProjectMap: RepositoryMap;
}

/**
 *
 */
export async function generateRepositoryMaps(projectInfos: ProjectInfo[]): Promise<RepositoryMaps> {
	// Load buildDocs summaries
	const summaries: Map<string, Summary> = await loadBuildDocsSummaries();

	let languageProjectMap = '';
	if (projectInfos.length > 0) {
		const projectInfo = projectInfos[0];
		if (projectInfo.languageTools) {
			languageProjectMap = await projectInfo.languageTools.generateProjectMap();
			logger.info(`languageProjectMap ${await countTokens(languageProjectMap)}`);
		}
		if (projectInfos.length > 1) {
			logger.info('TODO handle multiple projectInfos');
		}
	}

	const fileSystemTree = await getFileSystem().getFileSystemTree();

	const fileSystemTreeWithSummaries = await generateFileSystemTreeWithSummaries(summaries, false);
	const folderSystemTreeWithSummaries = await generateFolderTreeWithSummaries(summaries);

	return {
		fileSystemTree: { text: fileSystemTree, tokens: await countTokens(fileSystemTree) },
		folderSystemTreeWithSummaries: { text: folderSystemTreeWithSummaries, tokens: await countTokens(folderSystemTreeWithSummaries) },
		fileSystemTreeWithSummaries: { text: fileSystemTreeWithSummaries, tokens: await countTokens(fileSystemTreeWithSummaries) },
		repositorySummary: await getTopLevelSummary(),
		languageProjectMap: { text: languageProjectMap, tokens: await countTokens(languageProjectMap) },
	};
}

async function generateFolderTreeWithSummaries(summaries: Map<string, Summary>): Promise<string> {
	const fileSystem = getFileSystem();
	const treeStructure = await fileSystem.getFileSystemTreeStructure();
	let documentation = '';

	for (const [folderPath, files] of Object.entries(treeStructure)) {
		const folderSummary = summaries.get(folderPath);
		documentation += `${folderPath}/ (${files.length} files)  ${folderSummary ? `  ${folderSummary.sentence}` : ''}\n`;
		documentation += '\n';
	}
	return documentation;
}

/**
 * Generates a project file system tree with the folder long summaries and file short summaries
 * @param summaries
 * @param includeFileSummaries
 */
async function generateFileSystemTreeWithSummaries(summaries: Map<string, Summary>, includeFileSummaries: boolean): Promise<string> {
	const fileSystem = getFileSystem();
	const treeStructure = await fileSystem.getFileSystemTreeStructure();
	let documentation = '';

	for (const [folderPath, files] of Object.entries(treeStructure)) {
		const folderSummary = summaries.get(folderPath);
		documentation += `${folderPath}/  ${folderSummary ? `  ${folderSummary.sentence}` : ''}\n`;

		for (const file of files) {
			const filePath = `${folderPath}/${file}`;
			const fileSummary = summaries.get(filePath);
			if (fileSummary && includeFileSummaries) {
				documentation += `  ${file}  ${fileSummary.sentence}\n`;
			} else {
				documentation += `  ${file}\n`;
			}
		}
		documentation += '\n';
	}
	return documentation;
}

export async function loadBuildDocsSummaries(): Promise<Map<string, Summary>> {
	const summaries = new Map<string, Summary>();
	const fileSystem = getFileSystem();
	const docsDir = `${sophiaDirName}/docs`;
	logger.info(`Load summaries from ${docsDir}`);

	try {
		const dirExists = await fileSystem.fileExists(docsDir);
		if (!dirExists) {
			logger.warn(`The ${docsDir} directory does not exist.`);
			return summaries;
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
	}

	logger.info(`Loaded ${summaries.size} summaries`);
	return summaries;
}
