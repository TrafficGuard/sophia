import { getFileSystem, llms } from '#agent/agentContextLocalStorage';

export interface CompileErrorAnalysis {
	compilerOutput: string;
	compileIssuesSummary: string;
	researchQuery: string;
	installPackages: string[];
	additionalFiles: string[];
	fatalError: string;
}

export interface CompileErrorAnalysisDetails extends CompileErrorAnalysis {
	researchResult?: string;
	/** diff since the last successfully compiled commit */
	diff?: string;
}

/**
 *
 * @param compilerOutput
 * @param initialFileSelection
 * @param compileErrorSummaries the previous compile error summaries
 */
export async function analyzeCompileErrors(
	compilerOutput: string,
	initialFileSelection: string[],
	compileErrorSummaries: string[],
): Promise<CompileErrorAnalysis> {
	const fileContents = `<file_contents>\n${await getFileSystem().readFilesAsXml(initialFileSelection)}\n</file_contents>`;
	// const fileList = `<project_filenames>\n${(await getFileSystem().listFilesRecursively()).join('\n')}\n</project_filenames>`;
	// TODO need to add ts-imports info to resolve imports to file paths
	let compileErrorHistory = '';
	if (compileErrorSummaries.length) {
		compileErrorHistory += '<compile-error-history>\n';
		for (const summary of compileErrorSummaries) compileErrorHistory += '<compile-error-summary>${summary}</compile-error-summary>\n';
		compileErrorHistory += '</compile-error-history>';
	}
	const compileOutputXml = `<compiler_output>\n${compilerOutput}\n</compiler_output>`;

	const currentFileList = `<current-files>\n${initialFileSelection.join('\n')}\n</current-files>`;

	const instructions =
		'The compile errors above need to be analyzed to determine next steps fixing them. You will respond with a JSON object in the format of the example.\n' +
		'- Include a brief summary of the compile issues in the "compileIssuesSummary" property.\n' +
		'- If addtional files not in the <current-files> tag are required to be added to the context to help fix the issues (ie. have compile errors to fix in that file, or needed for implementation details, interfaces, typings etc) then set an array of the filenames on the "additionalFiles" property.\n' +
		'- If you need to perform research to fix a compile issue (e.g. how to use a library/API, or fix an obscure compiler error) then set a natural language query to search on the "researchQuery" property.\n' +
		'- If the compile errors indicate one or more missing packages/modules, then set an array with the missing packages, e.g. ["package1", "package2"], on the "installPackages" property.\n' +
		'- If there appears to be an fatal error which can\'t be fixed (e.g. configuration issue, or stuck on the same error multiple times, or a dependant project needs to be updated) that requires human intervention, then set a message describing the problem in the "fatalError" property.\n' +
		`Respond with your resoning following by the JSON object that MUST be in the format of this example:
<response_example>
- Analysis of the compile issues
- Reasoning if any additional files need to be added to the available <file_contents> list which have compile errors or required implementation details
- Reasoning if any web research is required to fix issues
- Reasoning if there is a fatal error
<json>
{
   "compileIssuesSummary": "",
   "researchQuery": "",
   "installPackages": [],
   "additionalFiles": [],
   "fatalError": ""
}
</json>
</response_example>`;

	// ${fileList}\n
	const prompt = `${fileContents}\n${compileErrorHistory}\n${compileOutputXml}\n${currentFileList}\n${instructions}`;
	const analysis: CompileErrorAnalysis = await llms().hard.generateJson(prompt, {
		id: 'analyzeCompileErrors',
	});
	analysis.compilerOutput = compilerOutput;
	return analysis;
}
