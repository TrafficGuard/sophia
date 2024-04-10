import { writeFileSync } from 'fs';
import { llms } from '../agent/workflows';
import { LLM } from '../llm/llm';
import { CodeEditor } from './codeEditor';
import { buildPrompt } from './devEditWorkflow';

export async function makeChanges(requirements: string, files: string[]): Promise<void> {
	await new CodeEditor().editFilesToMeetRequirements(requirements, files);
	// const prompt = buildPrompt({
	// 	information: files,
	// 	requirements: summary,
	// 	action: `Make changes where required to the files to fulfill the requirements.
	// 	Add comments to your changes to explain your reasoning.
	// 	Follow the same formatting styles in the original files.
	// 	Re-use existing functionality in the files.
	// 	Only output the files which have been changed.
	// 	Output your results in the format:
	// 	<reasoning>
	// 	</reasoning>
	// 	<file_contents path="dir/updated_file1.ext">${CDATA_START}
	//     The updated contents
	// 	${CDATA_END}</file_contents>
	// 	<file_contents path="dir/updated_file2.ext">${CDATA_START}
	//     The updated contents
	// 	${CDATA_END}</file_contents>
	// 	`
	// })
	// const response = await llms().hard.generateText(prompt);
	// // const response = readFileSync('response.txt', 'utf8');
	// const changes = parseMakeChangesResponse(response);
	// //   console.log(changes);
	//
	// await applyChanges(projectPath, changes);
}

// function parseMakeChangesResponse(response: string): Array<{ path: string; content: string }> {
// 	const regex = /<file_contents path="(.*?)">(.*?)<\/file_contents>/gs;
// 	const results: Array<{ path: string; content: string }> = [];
// 	let match: RegExpExecArray | null;
// 	while ((match = regex.exec(response)) !== null) {
// 		if (match) {
// 			results.push({
// 				path: match[1],
// 				content: match[2].trim(),
// 			});
// 		}
// 	}
// 	return results;
// }
//
// function applyChanges(projectPath: string, changes: Array<{ path: string; content: string }>) {
// 	for (const change of changes) {
// 		const path = `${projectRoots}/${projectPath}/${change.path}`;
// 		console.log(`Writing to ${path}`);
// 		// validate the file exists
// 		writeFileSync(path, change.content);
// 	}
// }
