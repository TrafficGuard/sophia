import { getFileSystem, llms } from '#agent/agentContextLocalStorage';
import { logger } from '#o11y/logger';
import { buildPrompt } from '#swe/softwareDeveloperAgent';

/**
 * @param requirements
 * @param sourceBranchOrCommit the source branch or commit to review from
 */
// TODO we'll need to be smarter about what the source branch/commit is to review from
// as there might not a source branch to compare against, so we need the base commit.
// Otherwise just review the current files.
export async function reviewChanges(requirements: string, sourceBranchOrCommit: string): Promise<string[]> {
	const prompt = buildPrompt({
		information: `The following is the git diff of the changes made so far to meet the requirements:\n<diff>\n${await getFileSystem().vcs.getBranchDiff(
			sourceBranchOrCommit,
		)}\n</diff>`,
		requirements,
		// action: 'Do the changes in the diff satisfy the requirements, and why or why not? Do the changes follow the same style as the rest of the code? Are any of the changes redundant?' +
		// 'If so explain why and finish with the output <complete/>. If not, detail what changes you would still like to make. Output your answer in the JSON matching this TypeScript interface:\n' +
		// '{\n requirementsMet: boolean\n requirementsMetReasoning: string\n sameStyle: boolean\n sameStyleReasoning: string\n redundant: boolean\n redundantReasoning: string\n}'
		action:
			'Do the changes in the diff satisfy the requirements, and explain why? Are there any redundant changes in the diff? Was any code removed in the changes which should not have been? Is the solution sufficiently generic? Review the style of the code changes in the diff carefully against the original code.  Do the changes follow all the style conventions of the original code? Explain why.\n' +
			'Review your analysis decide if any more code editing needs to be done, and then finish responding with a JSON array in the following format with the surrounding json tags:' +
			'<json>' +
			'[' +
			'	"description of change 1 on a single line",' +
			'	"description of another change required on a single line",' +
			']</json>\n' +
			'\n' +
			'If you are satified then return an empty array. If there are changes to be made then provided detailed focused instruction on what to change in each array item',
	});

	logger.info(`Reviewing diff from ${sourceBranchOrCommit}`);

	const reviewItems = (await llms().hard.generateJson(
		prompt,
		'You are an experienced software engineer with an eye for detail and robust software engineering practices, design and styles across security, observability, reliability, object-orientated design, functional programming and performance.',
		{ id: 'review-code-changes' },
	)) as string[];
	logger.info(reviewItems);
	return reviewItems;
}
