import { getFileSystem } from '#agent/agentContextLocalStorage';
import { countTokens } from '#llm/tokens';
import { logger } from '#o11y/logger';
import { Summary } from '#swe/documentationBuilder';
import { ProjectInfo } from '#swe/projectDetection';
import { errorToString } from '#utils/errors';
import { sophiaDirName } from '../appVars';

interface ProjectMap {
	text: string;
	tokens?: number;
}

export interface ProjectMaps {
	fileSystemTree: ProjectMap;
	fileSystemTreeWithSummaries: ProjectMap;
	languageProjectMap: ProjectMap;
}

/**
 *
 */
export async function generateProjectMaps(projectInfo: ProjectInfo): Promise<ProjectMaps> {
	// Load buildDocs summaries
	const summaries: Map<string, Summary> = await loadBuildDocsSummaries();

	let languageProjectMap = '';
	if (projectInfo.languageTools) {
		languageProjectMap = await projectInfo.languageTools.generateProjectMap();
		logger.info(`languageProjectMap ${await countTokens(languageProjectMap)}`);
	}

	const fileSystemTree = await getFileSystem().getFileSystemTree();

	const fileSystemTreeWithSummaries = await generateFileSystemTreeWithSummaries(summaries, false);

	return {
		fileSystemTree: { text: fileSystemTree },
		fileSystemTreeWithSummaries: { text: fileSystemTreeWithSummaries },
		languageProjectMap: { text: languageProjectMap },
	};
}

async function generateFileSystemTreeWithSummaries(summaries: Map<string, Summary>, includeFileSummaries: boolean): Promise<string> {
	const fileSystem = getFileSystem();
	const treeStructure = await fileSystem.getFileSystemTreeStructure();
	let documentation = '';

	for (const [folderPath, files] of Object.entries(treeStructure)) {
		const folderSummary = summaries.get(folderPath);
		documentation += `${folderPath}/  ${folderSummary ? `  ${folderSummary.paragraph}` : ''}\n`;

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
