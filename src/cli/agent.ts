import '#fastify/trace-init/trace-init'; // leave an empty line next so this doesn't get sorted from the first line

import { provideFeedback, resumeCompleted, resumeError, resumeHil, startAgentAndWait } from '#agent/agentRunner';
import { FileSystemRead } from '#functions/storage/FileSystemRead';
import { Perplexity } from '#functions/web/perplexity';
import { PublicWeb } from '#functions/web/web';
import { ClaudeLLMs } from '#llm/models/anthropic';
import { ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { logger } from '#o11y/logger';
import { CodeEditingAgent } from '#swe/codeEditingAgent';
import { SoftwareDeveloperAgent } from '#swe/softwareDeveloperAgent';
import { appContext, initFirestoreApplicationContext } from '../app';
import { parseProcessArgs, saveAgentId } from './cli';

export async function main() {
	let llms = ClaudeLLMs();
	if (process.env.GCLOUD_PROJECT) {
		await initFirestoreApplicationContext();
		llms = ClaudeVertexLLMs();
	}

	let functions: Array<any>;
	functions = [FileSystemRead, SoftwareDeveloperAgent, Perplexity, PublicWeb];
	functions = [CodeEditingAgent, Perplexity];
	functions = [FileSystemRead];

	const { initialPrompt, resumeAgentId } = parseProcessArgs();

	console.log(`Prompt: ${initialPrompt}`);

	if (resumeAgentId) {
		const agent = await appContext().agentStateService.load(resumeAgentId);
		switch (agent.state) {
			case 'completed':
				return await resumeCompleted(resumeAgentId, agent.executionId, initialPrompt);
			case 'error':
				return resumeError(resumeAgentId, agent.executionId, initialPrompt);
			case 'hil':
				return await resumeHil(resumeAgentId, agent.executionId, initialPrompt);
			case 'feedback':
				return await provideFeedback(resumeAgentId, agent.executionId, initialPrompt);
		}
	}
	const agentId = await startAgentAndWait({
		agentName: 'cli-agent',
		initialPrompt,
		functions,
		llms,
		type: 'codegen',
		resumeAgentId,
	});
	logger.info('AgentId ', agentId);

	saveAgentId('agent', agentId);
}

main().then(
	() => console.log('done'),
	(e) => console.error(e),
);
