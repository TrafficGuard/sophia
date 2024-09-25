import { Type } from '@sinclair/typebox';
import { getFileSystem } from '#agent/agentContextLocalStorage';
import { RunAgentConfig } from '#agent/agentRunner';
import { runAgentWorkflow } from '#agent/agentWorkflowRunner';
import { ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { Gemini_1_5_Flash } from '#llm/models/vertexai';
import { logger } from '#o11y/logger';
import { CodeEditingAgent } from '#swe/codeEditingAgent';
import { codebaseQuery } from '#swe/codebaseQuery';
import { AppFastifyInstance } from '../../app';


export async function codeRoutes(fastify: AppFastifyInstance) {
	// /get
	// See https://docs.gitlab.com/ee/user/project/integrations/webhook_events.html#merge-request-events
	fastify.post(
		'/api/code/edit',
		{
			schema: {
				body: Type.Object({
					workingDirectory: Type.String(),
					requirements: Type.String(),
				}),
			},
		},
		async (request, reply) => {
			const { workingDirectory, requirements } = request.body as { workingDirectory: string; requirements: string };

			let agentName = 'code-ui';
			try {
				agentName = await Gemini_1_5_Flash().generateText(
					`<requirements>${requirements}</requirements>\nGenerate a summary of the requirements in a short sentence. Only output the summary, nothing else.`,
				);
			} catch (e) {
				logger.error('Error generating code agent name', e);
			}

			try {
				const config: RunAgentConfig = {
					agentName,
					llms: ClaudeVertexLLMs(),
					functions: [],
					initialPrompt: requirements,
					humanInLoop: {
						budget: 2,
					},
				};

				await runAgentWorkflow(config, async () => {
					if(workingDirectory?.trim())
						getFileSystem().setWorkingDirectory(workingDirectory)
					await new CodeEditingAgent().runCodeEditWorkflow(config.initialPrompt);
				});

				reply.send({ success: true, message: 'Code edit workflow completed successfully' });
			} catch (error) {
				logger.error(error, 'Error running code agent');
				reply.status(500).send({ success: false, message: error.message });
			}
		},
	);

	fastify.post(
		'/api/code/query',
		{
			schema: {
				body: Type.Object({
					workingDirectory: Type.String(),
					query: Type.String(),
				})
			},
		},
		async (request, reply) => {
			const { workingDirectory, query } = request.body as { workingDirectory: string; query: string };
			try {
				const config: RunAgentConfig = {
					agentName: `Query: ${query}`,
					llms: ClaudeVertexLLMs(),
					functions: [], //FileSystem,
					initialPrompt: '',
					humanInLoop: {
						budget: 2,
					},
				};

				let response = '';
				await runAgentWorkflow(config, async () => {
					if(workingDirectory?.trim())
						getFileSystem().setWorkingDirectory(workingDirectory)
					response = await codebaseQuery(query);
				});

				reply.send(response);
			} catch (error) {
				logger.error(error, 'Error running codebase query');
				reply.status(500).send(error.message);
			}
		},
	);
}
