import { GoogleCloud } from '#functions/cloud/google-cloud';
import { Jira } from '#functions/jira';
import { GitHub } from '#functions/scm/github';
import { GitLab } from '#functions/scm/gitlab';
import { Slack } from '#functions/slack';
import { FileSystem } from '#functions/storage/filesystem';
import { UtilFunctions } from '#functions/util';
import { Perplexity } from '#functions/web/perplexity';
import { CodeEditingAgent } from '#swe/codeEditingAgent';
import { SoftwareDeveloperAgent } from '#swe/softwareDeveloperAgent';

/**
 * Add any function classes to be made available here to ensure their function schemas are registered
 * @return the constructors for the function classes
 */
export function functionRegistry(): Array<new () => any> {
	return [
		CodeEditingAgent,
		FileSystem,
		GitLab,
		// GitHub, // Error: More than one function classes found implementing SourceControlManagement
		GoogleCloud,
		Jira,
		Perplexity,
		Slack,
		SoftwareDeveloperAgent,
		UtilFunctions,
		// Add your own classes below this line
	];
}
