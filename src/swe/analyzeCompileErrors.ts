import { getFileSystem, llms } from '#agent/agentContext';

export interface CompileErrorAnalysis {
	compilerOutput: string;
	compileIssuesSummary: string;
	researchQuery: string;
	installPackages: string[];
	additionalFiles: string[];
}

export interface CompileErrorAnalysisDetails extends CompileErrorAnalysis {
	researchResult?: string;
	/** diff since the last successfully compiled commit */
	diff?: string;
}

export async function analyzeCompileErrors(compilerOutput: string, initialFileSelection: string[]): Promise<CompileErrorAnalysis> {
	const fileContents = `<file_contents>\n${await getFileSystem().getMultipleFileContentsAsXml(initialFileSelection)}\n</file_contents>`;
	const fileList = `<project_filenames>\n${(await getFileSystem().listFilesRecursively()).join('\n')}\n</project_filenames>`;
	const compileOutputXml = `<compiler_output>\n${compilerOutput}\n</compiler_output>`;

	const instructions =
		'The compile errors above need to be analyzed to determine next steps fixing them. You will respond with a JSON object in the format of the example.\n' +
		'Include a brief summary of the compile issues in the "compileIssuesSummary" property.\n' +
		'If addtional files are required (for implementation details, interfaces, typings etc. or with compile errors to fix) then set an array of the filenames on the "additionalFiles" property.\n' +
		'If you need to perform research to fix a compile issue (e.g. how to use a library, or fix an obscure compiler error) then set a natural language query to search on the "webResearch" property.\n' +
		'If the compile errors indicate one or more missing packages/modules, then set an array with the missing packages, e.g. ["package1", "package2"], on the "installPackages" property.\n' +
		`Respond with your resoning following by the JSON object that MUST be in the format of this example:
<response_example>
- Analysis of the compile issues
- Reasoning for any additional files required
- Reasoning for any web research to fix issues
<json>
{
   "compileIssuesSummary": "",
   "researchQuery": "",
   "installPackages": [],
   "additionalFiles: [],
}
</json>
</response_example>`;

	const prompt = `${fileList}\n${fileContents}\n${compileOutputXml}\n${instructions}`;
	const analysis: CompileErrorAnalysis = await llms().hard.generateTextAsJson(prompt, null, {
		id: 'analyzeCompileErrors',
	});
	analysis.compilerOutput = compilerOutput;
	return analysis;
}
