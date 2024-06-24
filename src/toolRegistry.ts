import { FileSystem } from '#functions/filesystem';
import { GoogleCloud } from '#functions/google-cloud';
import { Jira } from '#functions/jira';
import { GitLabServer } from '#functions/scm/gitlab';
import { Slack } from '#functions/slack';
import { UtilFunctions } from '#functions/util';
import { Perplexity } from '#functions/web/perplexity';
import { CodeEditingAgent } from '#swe/codeEditingAgent';
import { SoftwareDeveloperAgent } from '#swe/softwareDeveloperAgent';

/**
 * Add any tools to be made available here to ensure their function definitions are registered
 */
export function toolRegistry(): any[] {
	return [
		CodeEditingAgent,
		FileSystem,
		GitLabServer,
		GoogleCloud,
		Jira,
		Perplexity,
		Slack,
		SoftwareDeveloperAgent,
		UtilFunctions,
		// Add your own tools below this line
	];
}
