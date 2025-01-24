import path from 'path';
import { getFileSystem, llms } from '#agent/agentContextLocalStorage';
import { LlmMessage } from '#llm/llm';
import { logger } from '#o11y/logger';
import { ProjectInfo, detectProjectInfo, getProjectInfo } from '#swe/projectDetection';
import { getRepositoryOverview } from '#swe/repoIndexDocBuilder';
import { RepositoryMaps, generateRepositoryMaps } from '#swe/repositoryMap';

/*
Agent which iteratively loads files to find the file set required for a task/query.

After each iteration the agent should accept or ignore each of the new files loaded.

This agent is designed to utilise LLM prompt caching.
*/

interface InitialResponse {
	inspectFiles?: string[];
}

interface IterationResponse {
	keepFiles?: SelectedFile[];
	ignoreFiles?: SelectedFile[];
	inspectFiles?: string[];
}

export interface SelectedFile {
	/** The file path */
	path: string;
	/** The reason why this file needs to in the file selection */
	reason: string;
	/** If the file should not need to be modified when implementing the task. Only relevant when the task is for making changes, and not just a query. */
	readonly?: boolean;
}

export interface FileExtract {
	/** The file path */
	path: string;
	/** The extract of the file contents which is relevant to the task */
	extract: string;
}

async function initializeFileSelectionAgent(requirements: string, projectInfo?: ProjectInfo): Promise<LlmMessage[]> {
	// Ensure projectInfo is available
	projectInfo ??= (await detectProjectInfo())[0];

	// Generate repository maps and overview
	const projectMaps: RepositoryMaps = await generateRepositoryMaps([projectInfo]);
	const repositoryOverview: string = await getRepositoryOverview();
	const fileSystemWithSummaries: string = `<project_files>\n${projectMaps.fileSystemTreeWithFileSummaries.text}\n</project_files>\n`;

	// Construct the initial prompt
	const systemPrompt = `${repositoryOverview}${fileSystemWithSummaries}

Your task is to select the minimal, complete file set that will be required for completing the task/query in the requirements.

Always respond only in the format/instructions requested.

# Process Files Response Instructions

When requested to respond as per the Proces Files Response Instructions you will need to keep/ignore each of the files you previously selected to inspect, giving a reason why.
Then you can select additional files to read and inspect if required from the <project_files> provided in the system instructions.

## Response Format
Your response must finish in the following format:
<observations-to-requirements>
</observations-to-requirements>
<keep-ignore-thinking>
</keep-ignore-thinking>
<select-files-thinking>
	<!-- what referenced files would need to be included for the task. You are working in an established codebase, so you should use existing files/design where possible etc -->
</select-files-thinking>
<requirements-solution-thinking>
</requirements-solution-thinking>
<json>
</json>

## Response Format Contents

The final part of the response should be a JSON object in the following format:
<json>
{
  keepFiles:[
    {"path": "dir/file1", "reason": "..."}
  ],
  ignoreFiles:[
    {"path": "dir/file1", "reason": "..."}
  ],
  inspectFiles: [
    "dir1/dir2/file2"
  ]
}
</json>

If you believe that you have all the files required for the requirements task/query, then return an empty array for inspectFiles.
`;
	// Do not include file contents unless they have been provided to you.
	const initialUserPrompt = `<requirements>\n${requirements}\n</requirements>

# Initial Response Instructions

For this initial file selection step respond in the following format:
<observations-related-to-requirements>
</observations-related-to-requirements>
<select-files-thinking>
</select-files-thinking>
<json>
</json>

Your response must end with a JSON object wrapped in <json> tags in the following format:
<json>
{
  "inspectFiles": ["dir/file1", "dir1/dir2/file2"]
}
</json>
`;
	return [
		{ role: 'system', content: systemPrompt, cache: 'ephemeral' },
		{ role: 'user', content: initialUserPrompt, cache: 'ephemeral' },
	];
}

async function generateFileSelectionProcessingResponse(messages: LlmMessage[], pendingFiles: string[], iteration: number): Promise<IterationResponse> {
	const prompt = `
${(await readFileContents(pendingFiles)).contents}

The files that must be included in either the keepFiles or ignoreFiles properties are:
${pendingFiles.join('\n')}

Respond only as per the Process Files Response Instructions.
`;
	const iterationMessages: LlmMessage[] = [...messages, { role: 'user', content: prompt }];

	return await llms().medium.generateTextWithJson(iterationMessages, { id: `Select Files iteration ${iteration}` });
}

async function processedIterativeStepUserPrompt(response: IterationResponse): Promise<LlmMessage> {
	const ignored = response.ignoreFiles?.map((s) => s.path) ?? [];
	const kept = response.keepFiles?.map((s) => s.path) ?? [];

	let ignoreText = '';
	if (ignored.length) {
		ignoreText = '\nRemoved the following ignored files:';
		for (const ig of response.ignoreFiles) {
			ignoreText += `\n${ig.path} - ${ig.reason}`;
		}
	}

	return {
		role: 'user',
		content: `${(await readFileContents(kept)).contents}${ignoreText}`,
	};
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
 * 0 - SYSTEM/USER : given <task> and <filesystem-tree> and <repository-overview> select initial files for the task.
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
 * The history of the actions will be kept, and always included in final message to the LLM.
 *
 * All files staged in a previous step must be processed in the next step (ie. added, extracted or removed)
 *
 * @param requirements
 * @param projectInfo
 */
async function selectFilesCore(
	requirements: string,
	projectInfo?: ProjectInfo,
): Promise<{
	messages: LlmMessage[];
	selectedFiles: SelectedFile[];
}> {
	const messages: LlmMessage[] = await initializeFileSelectionAgent(requirements, projectInfo);

	const maxIterations = 10;
	let iterationCount = 0;

	const initialResponse: InitialResponse = await llms().medium.generateTextWithJson(messages, { id: 'Select Files initial' });
	messages.push({ role: 'assistant', content: JSON.stringify(initialResponse) });

	let filesToInspect = initialResponse.inspectFiles || [];

	const keptFiles = new Set<{ path: string; reason: string }>();
	const ignoredFiles = new Set<{ path: string; reason: string }>();

	while (filesToInspect.length > 0) {
		iterationCount++;
		if (iterationCount > maxIterations) throw new Error('Maximum interaction iterations reached.');

		const response: IterationResponse = await generateFileSelectionProcessingResponse(messages, filesToInspect, iterationCount);
		logger.info(response);
		for (const ignored of response.ignoreFiles ?? []) ignoredFiles.add(ignored);
		for (const kept of response.keepFiles ?? []) keptFiles.add(kept);

		messages.push(await processedIterativeStepUserPrompt(response));
		// Don't cache the final result as it would only potentially be used once when generating a query answer
		const cache = filesToInspect.length ? 'ephemeral' : undefined;
		messages.push({
			role: 'assistant',
			content: JSON.stringify(response),
			cache,
		});

		// Max of 4 cache tags with Anthropic. Clear the first one after the cached system prompt
		const cachedMessages = messages.filter((msg) => msg.cache === 'ephemeral');
		if (cachedMessages.length > 4) {
			logger.info('Removing cache tag');
			cachedMessages[1].cache = undefined;
		}

		filesToInspect = response.inspectFiles;

		// TODO if keepFiles and ignoreFiles doesnt have all of the files in filesToInspect, then
		// filesToInspect = filesToInspect.filter((path) => !keptFiles.has(path) && !ignoredFiles.has(path));
	}

	if (keptFiles.size === 0) throw new Error('No files were selected to fulfill the requirements.');

	const selectedFiles = Array.from(keptFiles.values());

	return { messages, selectedFiles };
}

export async function selectFilesAgent(requirements: string, projectInfo?: ProjectInfo): Promise<SelectedFile[]> {
	const { selectedFiles } = await selectFilesCore(requirements, projectInfo);
	return selectedFiles;
}

export async function queryWorkflow(query: string, projectInfo?: ProjectInfo): Promise<string> {
	const { messages, selectedFiles } = await selectFilesCore(query, projectInfo);

	// Construct the final prompt for answering the query
	const finalPrompt = `<query>                                                                                                                                                                                                                                                                                                                                                                                           
${query}
</query>                                                                                                                                                                                                                                                                                                                                                                                          
																																																																																													 
Please provide a detailed answer to the query using the information from the available file contents, and including citations to the files where the relevant information was found.
Respond in the following format (Note only the contents of the result tag will be returned to the user):

<thinking></thinking>
<reflection></reflection>
<result></result>                                                                                                                                                                                                                                                                                 
 `;

	messages.push({ role: 'user', content: finalPrompt });

	// Perform the additional LLM call to get the answer
	const answer = await llms().medium.generateTextWithResult(messages, { id: 'Select Files query' });
	return answer.trim();
}

async function readFileContents(filePaths: string[]): Promise<{ contents: string; invalidPaths: string[] }> {
	const fileSystem = getFileSystem();
	let contents = '<files>\n';

	const invalidPaths = [];

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
			contents += `Invalid path ${filePath}\n`;
			invalidPaths.push(filePath);
		}
	}
	return { contents: `${contents}</files>`, invalidPaths };
}
