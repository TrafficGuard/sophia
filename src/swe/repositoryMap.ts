import { getFileSystem } from '#agent/agentContextLocalStorage';
import { countTokens } from '#llm/tokens';
import { logger } from '#o11y/logger';
import { ProjectInfo } from '#swe/projectDetection';
import { Summary, getTopLevelSummary, loadBuildDocsSummaries } from './documentationBuilder';

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
		documentation += `${folderPath}/ (${files.length} files)  ${folderSummary ? `  ${folderSummary.short}` : ''}\n`;
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
		documentation += `${folderPath}/  ${folderSummary ? `  ${folderSummary.short}` : ''}\n`;

		for (const file of files) {
			const filePath = `${folderPath}/${file}`;
			const fileSummary = summaries.get(filePath);
			if (fileSummary && includeFileSummaries) {
				documentation += `  ${file}  ${fileSummary.short}\n`;
			} else {
				documentation += `  ${file}\n`;
			}
		}
		documentation += '\n';
	}
	return documentation;
}
