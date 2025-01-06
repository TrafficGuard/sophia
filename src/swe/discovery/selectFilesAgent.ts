import path from 'path';
import { getFileSystem, llms } from '#agent/agentContextLocalStorage';
import { LlmMessage } from '#llm/llm';
import { logger } from '#o11y/logger';
import { getRepositoryOverview } from '#swe/documentationBuilder';
import { ProjectInfo, getProjectInfo } from '#swe/projectDetection';
import { RepositoryMaps, generateRepositoryMaps } from '#swe/repositoryMap';

// WORK IN PROGRESS ------

interface AssistantAction {
	inspectFiles?: string[];
	selectFiles?: SelectedFile[];
	ignoreFiles?: string[];
	complete?: boolean;
}

export interface FileSelection {
	files: SelectedFile[];
	extracts?: FileExtract[];
}

export interface SelectedFile {
	/** The file path */
	path: string;
	/** The reason why this file needs to in the file selection */
	reason: string;
	/** If the file should not need to be modified when implementing the task. Only relevant when the task is for making changes, and not just a query. */
	readonly: boolean;
}

export interface FileExtract {
	/** The file path */
	path: string;
	/** The extract of the file contents which is relevant to the task */
	extract: string;
}

function getStageInstructions(stage: 'initial' | 'post_inspect' | 'all_inspected'): string {
	if (stage === 'initial') {
		return `
At this stage, you should decide which files to inspect based on the requirements and project map.

**Valid Actions**:
- Request to inspect files by providing "inspectFiles": ["file1", "file2"]

**Response Format**:
Respond with a JSON object wrapped in <json>...</json> tags, containing only the **"inspectFiles"** property.

Do not include file contents unless they have been provided to you.
`;
	}
	if (stage === 'post_inspect') {
		return `
You have received the contents of the files you requested to inspect.

**Valid Actions**:
- Decide to select or ignore the inspected files by providing:
  - "selectFiles": [{"path": "file1", "reason": "...", "readonly": false}, ...]
  - "ignoreFiles": ["file2", ...]

**Response Format**:
Respond with a JSON object wrapped in <json>...</json> tags, containing **"selectFiles"** and/or **"ignoreFiles"** properties.

Do not include file contents unless they have been provided to you.
`;
	}
	if (stage === 'all_inspected') {
		return `
You have processed all inspected files.

**Valid Actions**:
- Request to inspect more files by providing "inspectFiles": ["file3", "file4"]
- If you have all the necessary files, complete the selection by responding with "complete": true

**Response Format**:
Respond with a JSON object wrapped in <json>...</json> tags, containing either:
- **"inspectFiles"** property, or
- **"complete": true**

Do not include file contents unless they have been provided to you.
`;
	}
	return '';
}

/**
 *
 * The repository maps have summaries of each file and folder.
 * For a large project the long summaries for each file may be too long.
 *
 * At each iteration the agent can:
 * - Request the summaries for a subset of folders of interest, when needing to explore a particular section of the repository
 * - Search the repository (or a sub-folder) for file contents matching a regex
 * OR
 * - Inspect the contents of file(s), providing their paths
 * OR (must if previously inspected files)
 * - Add an inspected file to the file selection.
 * - Ignore an inspected file if it's not relevant.
 * OR
 * - Complete with the current selection
 *
 * i.e. The possible actions are:
 * 1. Search for files
 * 2. Inspect files
 * 3. Add/ignore inspected files
 * 4. Complete
 *
 * where #3 must always follow #2.
 *
 * To maximize caching input tokens to the LLM, new messages will be added to the previous messages with the results of the actions.
 * This should reduce cost and latency compared to using the dynamic autonomous agents to perform the task. (However that might change if we get the caching autonomous agent working)
 *
 * Example:
 * [index] - [role]: [message]
 *
 * Messages #1
 * 0 - USER : given <task> and <filesystem-tree> and <repository-overview> select initial files for the task.
 *
 * Messages #2
 * 1 - ASSISTANT: { "inspectFiles": ["file1", "file2"] }
 * 0 - USER : given <task> and <filesystem-tree> and <repository-overview> select initial files for the task.
 *
 * Messages #3
 * 2 - USER: <file_contents path="file1"></file_contents><file_contents path="file2"></file_contents>. Respond with select/ignore
 * 1 - ASSISTANT: { "inspectFiles": ["file1", "file2"]}]}
 * 0 - USER : given <task> and <filesystem-tree> and <repository-overview> select initial files for the task.
 *
 * Messages #4
 * 3 - ASSISTANT: { "selectFiles": [{"path":"file1", "reason":"contains key details"], "ignoreFiles": [{"path":"file2", "reason": "did not contain the config"}] }
 * 2 - USER: <file_contents path="file1"></file_contents><file_contents path="file2"></file_contents>
 * 1 - ASSISTANT: { "inspectFiles": ["file1", "file2"] }
 * 0 - USER : given <task> and <filesystem-tree> and <repository-overview> select initial files for the task.
 *
 * Messages #5
 * 3 - ASSISTANT: { "selectFiles": [{"path":"file1", "reason":"contains key details"], "ignoreFiles": [{"path":"file2", "reason": "did not contain the config"}] }
 * 2 - USER: <file_contents path="file1"></file_contents><file_contents path="file2"></file_contents>
 * 1 - ASSISTANT: { "inspectFiles": ["file1", "file2"] }
 * 0 - USER : given <task> and <filesystem-tree> and <repository-overview> select initial files for the task.
 *
 *
 *
 * The history of the actions will be kept, and always included in final message to the LLM.
 *
 * All files staged in a previous step must be processed in the next step (ie. added, extracted or removed)
 *
 * @param requirements
 * @param projectInfo
 */
export async function selectFilesAgent(requirements: string, projectInfo?: ProjectInfo): Promise<FileSelection> {
	try {
		projectInfo ??= await getProjectInfo();
		const projectMaps: RepositoryMaps = await generateRepositoryMaps([projectInfo]);
		const repositoryOverview: string = await getRepositoryOverview();
		const fileSystemWithSummaries: string = `<project_map>\n${projectMaps.fileSystemTreeWithSummaries.text}\n</project_map>\n`;

		const messages: LlmMessage[] = [];
		const fileSelection: FileSelection = { files: [], extracts: [] };
		let stagedFiles: string[] = [];
		let isComplete = false;

		const initialPrompt = `${repositoryOverview}
        ${fileSystemWithSummaries}
        <requirements>
        ${requirements}
        </requirements>`;

		messages.push({ role: 'user', content: initialPrompt });

		const maxIterations = 5;
		let iterationCount = 0;

		while (!isComplete) {
			iterationCount++;
			if (iterationCount > maxIterations) {
				throw new Error('Maximum interaction iterations reached.');
			}

			// Determine the current stage
			let currentStage: 'initial' | 'post_inspect' | 'all_inspected';
			if (iterationCount === 1) {
				// First iteration
				currentStage = 'initial';
			} else if (stagedFiles.length > 0) {
				// Just provided file contents; expecting select or ignore
				currentStage = 'post_inspect';
			} else {
				// After processing inspected files
				currentStage = 'all_inspected';
			}

			// Get the stage-specific instructions
			const stageInstructions = getStageInstructions(currentStage);

			// Construct the current prompt by appending stage instructions
			const currentPrompt = `
<task>
Your task is to select files from the <project_map> to fulfill the given requirements.

Before responding, please follow these steps:
1. **Observations**: Make observations about the project and requirements.
2. **Thoughts**: Think about which files are necessary.
3. **Reasoning**: Provide reasoning for your choices.
4. **Response**: Finally, respond according to the instructions below.

${stageInstructions}
</task>`;

			// Add the current prompt to messages
			messages.push({ role: 'user', content: currentPrompt });

			// Call the LLM with the current messages
			const assistantResponse = await llms().medium.generateJson<AssistantAction>(messages);

			// Add the assistant's response to the conversation history
			messages.push({ role: 'assistant', content: JSON.stringify(assistantResponse) });

			// Handle the assistant's response based on the current stage
			if (currentStage === 'initial' && assistantResponse.inspectFiles) {
				// Read and provide the contents of the requested files
				const fileContents = await readFileContents(assistantResponse.inspectFiles);
				messages.push({ role: 'user', content: fileContents });
				stagedFiles = assistantResponse.inspectFiles;
			} else if (currentStage === 'post_inspect' && (assistantResponse.selectFiles || assistantResponse.ignoreFiles)) {
				// Process selected files and remove ignored files from staging
				if (assistantResponse.selectFiles) {
					fileSelection.files.push(...assistantResponse.selectFiles);
				}
				if (assistantResponse.ignoreFiles) {
					stagedFiles = stagedFiles.filter((f) => !assistantResponse.ignoreFiles.includes(f));
				}
				// Ensure all staged files have been processed
				if (stagedFiles.length > 0) {
					const message = `Please respond with select or ignore for the remaining files in the same JSON format as before.\n${JSON.stringify(stagedFiles)}`;
					messages.push({ role: 'user', content: message });
				} else {
					// Move to next stage
					stagedFiles = [];
				}
			} else if (currentStage === 'all_inspected') {
				if (assistantResponse.inspectFiles) {
					// Read and provide the contents of the requested files
					const fileContents = await readFileContents(assistantResponse.inspectFiles);
					messages.push({ role: 'user', content: fileContents });
					stagedFiles = assistantResponse.inspectFiles;
				} else if (assistantResponse.complete) {
					// Mark the selection process as complete
					isComplete = true;
				} else {
					throw new Error('Invalid response in all_inspected stage.');
				}
			} else {
				throw new Error('Unexpected response from assistant.');
			}
		}

		if (fileSelection.files.length === 0) {
			throw new Error('No files were selected to fulfill the requirements.');
		}

		logger.info(`Selected files: ${fileSelection.files.map((f) => f.path).join(', ')}`);

		return fileSelection;
	} catch (error) {
		logger.error('Error in selectFilesAgent:', error);
		throw error;
	}
}

async function readFileContents(filePaths: string[]): Promise<string> {
	const fileSystem = getFileSystem();
	let contents = '';

	for (const filePath of filePaths) {
		const fullPath = path.join(fileSystem.getWorkingDirectory(), filePath);
		try {
			const fileContent = await fileSystem.readFile(fullPath);
			contents += `<file_contents path="${filePath}">
${fileContent}
</file_contents>
`;
		} catch (e) {
			logger.info(`Couldn't read ${filePath}`);
			contents += `Couldn't read ${filePath}\n`;
		}
	}

	return contents;
}
