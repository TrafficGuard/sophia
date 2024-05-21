import { FileSystem } from '#functions/filesystem';
import { GoogleCloud } from '#functions/google-cloud';
import { Jira } from '#functions/jira';
import { GitLabServer } from '#functions/scm/gitlab';
import { Slack } from '#functions/slack';
import { UtilFunctions } from '#functions/util';
import { Perplexity } from '#functions/web/perplexity';
import { CodeEditingWorkflow } from '#swe/codeEditingWorkflow';
import { SoftwareDeveloperWorkflow } from '#swe/softwareDeveloperWorkflow';

/**
 * Add any tools to be made available here to ensure their function definitions are registered
 */
export function toolRegistry(): any[] {
	return [Perplexity, Jira, FileSystem, SoftwareDeveloperWorkflow, CodeEditingWorkflow, GitLabServer, GoogleCloud, Slack, UtilFunctions];
}
