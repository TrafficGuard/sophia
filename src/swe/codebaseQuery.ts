import { getFileSystem, llms } from '#agent/agentContextLocalStorage.ts';
import { LlmMessage } from '#llm/llm.ts';
import { getTopLevelSummary } from '#swe/documentationBuilder.ts';
import { ProjectInfo, getProjectInfo } from '#swe/projectDetection';
import { RepositoryMaps, generateRepositoryMaps } from '#swe/repositoryMap.ts';

interface FileSelection {
	files: string[];
}

export async function codebaseQuery(query: string): Promise<string> {
	const projectInfo: ProjectInfo = await getProjectInfo();
	const projectMaps: RepositoryMaps = await generateRepositoryMaps(projectInfo ? [projectInfo] : []);

	const messages: LlmMessage[] = [];

	console.log(projectMaps.fileSystemTreeWithSummaries.text);
	console.log(projectMaps.fileSystemTreeWithSummaries.tokens);
	const prompt = `<project-outline>
${projectMaps.fileSystemTreeWithSummaries.text}
<project-outline>


Your task is to search through the relevant files in the project to generate a report for the query
<query>${query}</query>

Your first task is from the project outlines to select the minimal list of files which will contain the information required to formulate an answer.

1. Make observations about the project releated to the query.

2. Explaing your thoughts and reasoning of what the minimal files (not folders) would be relevant to answer the query.

3. Output an initial list of files with reasoning for each file. (Do not include folders)

4. Reflect on your initial list and review the selections, whether any files could be removed, or if any particular files need to be added, and why.

5. Finally, taking your reflection into account, respond with the final file selection as a JSON object in the format:
<json>
{ "files": ["dir/file1", "dir/file1"] } 
</json>
`;

	const selection = (await llms().medium.generateJson(prompt)) as FileSelection;

	console.log(`${selection.files.join('\n')}\n\n`);
	const fileContents = await getFileSystem().readFilesAsXml(selection.files);

	const resultPrompt = `
	${await getTopLevelSummary()}
	${fileContents}
	
	<query>${query}</query>
	
	Give the project information and file contents, answer the query, providing references to the source files.
	
	1. List your observations relevant to query
	
	2. Reflect on your observations
	
	3. Output your response within <result></result> tags
	`;

	const response = await llms().medium.generateTextWithResult(resultPrompt);
	return response;
}
