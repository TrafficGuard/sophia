import { GoogleCloud } from '#functions/cloud/google-cloud';
import { ImageGen } from '#functions/image';
import { Jira } from '#functions/jira';
import { GitHub } from '#functions/scm/github';
import { GitLab } from '#functions/scm/gitlab';
import { FileSystemRead } from '#functions/storage/FileSystemRead';
import { LocalFileStore } from '#functions/storage/localFileStore';
import { LlmTools } from '#functions/util';
import { Perplexity } from '#functions/web/perplexity';
import { PublicWeb } from '#functions/web/web';
import { Slack } from '#modules/slack/slack';
import { CodeEditingAgent } from '#swe/codeEditingAgent';
import { SoftwareDeveloperAgent } from '#swe/softwareDeveloperAgent';

/**
 * Add any function classes to be made available here to ensure their function schemas are registered
 * @return the constructors for the function classes
 */
export function functionRegistry(): Array<new () => any> {
	return [
		CodeEditingAgent,
		FileSystemRead,
		// FileSystemWrite,
		LocalFileStore,
		GitLab,
		// GitHub, // Error: More than one function classes found implementing SourceControlManagement
		GoogleCloud,
		Jira,
		Perplexity,
		Slack,
		SoftwareDeveloperAgent,
		LlmTools,
		ImageGen,
		PublicWeb,
		// Add your own classes below this line
	];
}
