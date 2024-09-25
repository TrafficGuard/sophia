import { getFileSystem, llms } from '#agent/agentContextLocalStorage';
import { LlmMessage } from '#llm/llm';
import { getTopLevelSummary } from '#swe/documentationBuilder';
import { ProjectInfo, getProjectInfo } from '#swe/projectDetection';
import { RepositoryMaps, generateRepositoryMaps } from '#swe/repositoryMap';

interface FileSelection {
	files: string[];
}

export async function codebaseQuery(query: string): Promise<string> {
	let fileSelection = await firstPass(query);
	fileSelection = await secondPass(query, fileSelection);
	return synthesiseResult(query, fileSelection);
}

async function firstPass(query: string): Promise<string[]> {
	const projectInfo: ProjectInfo = await getProjectInfo();
	const projectMaps: RepositoryMaps = await generateRepositoryMaps(projectInfo ? [projectInfo] : []);

	console.log(projectMaps.fileSystemTreeWithSummaries.text);
	console.log(projectMaps.fileSystemTreeWithSummaries.tokens);
	const prompt = `${await getTopLevelSummary()}
<project-outline>
${projectMaps.fileSystemTreeWithSummaries.text}
<project-outline>


Your task is to search through the relevant files in the project to generate a report for the query
<query>${query}</query>

Your first task is from the project outlines to select the minimal list of files which will contain the information required to formulate an answer.

1. Make observations about the project releated to the query. Focus on functionality, not opinions.

2. Explaing your thoughts and reasoning of what the minimal files (not folders) would be relevant to answer the query.

3. Output an initial list of files with reasoning for each file. (Do not include folders)

4. Reflect on your initial list and review the selections, whether any files could be removed, or if any particular files need to be added, and why.

5. Finally, taking your reflection into account, respond with the final full file path selections as a JSON object in the format:
<json>
{ "files": ["config.json", "dir1/dir2/file1.txt", "dir1/dir2/dir3/source.ts"] } 
</json>
`;

	const fileSelection = (await llms().medium.generateJson(prompt)) as FileSelection;
	console.log(`${fileSelection.files.join('\n')}\n\n`);
	return fileSelection.files;
}

async function secondPass(query: string, filePaths: string[]): Promise<string[]> {
	return []
}

async function synthesiseResult(query: string, filePaths: string[]): Promise<string> {
	const fileContents = await getFileSystem().readFilesAsXml(filePaths);

	const resultPrompt = `
	${await getTopLevelSummary()}
	${fileContents}
	
	<query>${query}</query>
	
	Give the project information and file contents, answer the query, providing references to the source files.
	
	1. List your observations relevant to query, focusing on functionality. Only provide opinions if asked.
	
	2. Review and reflect on your observations taking into account the provided information and your knowledge on the subject  .
	
	3. Output your final query response within <result></result> tags
	`;

	return await llms().medium.generateTextWithResult(resultPrompt, null, {id:'codebase query synthesis'});
}
