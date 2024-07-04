import { getFileSystem, llms } from '#agent/agentContext';

export async function generatePullRequestTitleDescription(requirements: string): Promise<{ title: string; description: string }> {
	const pullRequestDescriptionPrompt = `<requirement>\n${requirements}\n</requirement><diff>\n${await getFileSystem().vcs.getBranchDiff()}\n</diff>\nFrom these requirements and diff, generate a description for a Pull Request/Merge Request`;

	const pullRequestDescription = await llms().medium.generateText(pullRequestDescriptionPrompt, 'Answer concisely', { id: 'Pull request description' });

	const pullRequestTitle = await llms().medium.generateText(
		`<requirement>\n${requirements}\n</requirement><mr_description>\n${pullRequestDescription}\n</mr_description>\nFrom this Merge Request description, generate a title for the Merge Request`,
		'Answer concisely',
		{ id: 'Pull request title' },
	);
	return {
		title: pullRequestTitle,
		description: pullRequestDescription,
	};
}
