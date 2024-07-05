import { getFileSystem, llms } from '#agent/agentContext';
import { buildPrompt } from '#swe/softwareDeveloperAgent';

async function reviewChanges(requirements: string) {
	const prompt = buildPrompt({
		information: `The following is the git diff of the changes made so far to meet the requirements:\n<diff>\n${await getFileSystem().vcs.getBranchDiff()}\n</diff>`,
		requirements,
		// action: 'Do the changes in the diff satisfy the requirements, and why or why not? Do the changes follow the same style as the rest of the code? Are any of the changes redundant?' +
		// 'If so explain why and finish with the output <complete/>. If not, detail what changes you would still like to make. Output your answer in the JSON matching this TypeScript interface:\n' +
		// '{\n requirementsMet: boolean\n requirementsMetReasoning: string\n sameStyle: boolean\n sameStyleReasoning: string\n redundant: boolean\n redundantReasoning: string\n}'
		action:
			'Do the changes in the diff satisfy the requirements, and explain why? Are there any redundant changes in the diff? Review the style of the code changes in the diff carefully against the original code.  Do the changes follow all of the style conventions of the original code, including preferring single/multi-line formatting, trailing characters etc? Explain why.\n' +
			'If there should be changes to the code to match the original style then output the updated diff with the fixes.',
	});

	const response = await llms().hard.generateText(prompt, null, { id: 'reviewChanges' });
}
