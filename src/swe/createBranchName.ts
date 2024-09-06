import { llms } from '#agent/agentContextLocalStorage';

export async function createBranchName(requirements: string, issueId?: string): Promise<string> {
	let branchName = await llms().medium.generateTextWithResult(
		`<requirements>${requirements}</requirement>\n
		From the requirements generate a Git branch name (up to about 10 words/200 characters maximum) to make the changes on. Seperate words with dashes. Output your response in <result></result>`,
		null,
		{ id: 'createBranchName' },
	);
	if (issueId) branchName = `${issueId}-${branchName}`;
	return branchName;
}
