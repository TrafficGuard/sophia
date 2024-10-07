import * as fs from 'fs';
import * as path from 'path';
import { join } from 'path';
import { Type } from '@sinclair/typebox';
import { getFileSystem } from '#agent/agentContextLocalStorage';
import { RunAgentConfig } from '#agent/agentRunner';
import { runAgentWorkflow } from '#agent/agentWorkflowRunner';
import { ClaudeVertexLLMs } from '#llm/models/anthropic-vertex';
import { Gemini_1_5_Flash } from '#llm/models/vertexai';
import { logger } from '#o11y/logger';
import { CodeEditingAgent } from '#swe/codeEditingAgent';
import { codebaseQuery } from '#swe/codebaseQuery';
import { SelectFilesResponse, selectFilesToEdit } from '#swe/selectFilesToEdit';
import { AppFastifyInstance } from '../../app';
import { sophiaDirName, systemDir } from '../../appVars';

function findRepositories(dir: string): string[] {
	const repos: string[] = [];
	const items = fs.readdirSync(dir, { withFileTypes: true });

	for (const item of items) {
		if (item.isDirectory()) {
			const fullPath = path.join(dir, item.name);
			if (fs.existsSync(path.join(fullPath, '.git'))) {
				repos.push(fullPath);
			} else {
				repos.push(...findRepositories(fullPath));
			}
		}
	}

	return repos;
}

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
					'<requirements>${requirements}</requirements>\nGenerate a summary of the requirements in a short sentence. Only output the summary, nothing else.',
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
					if (workingDirectory?.trim()) getFileSystem().setWorkingDirectory(workingDirectory);
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
				}),
			},
		},
		async (request, reply) => {
			let { workingDirectory, query } = request.body as { workingDirectory: string; query: string };
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
					// In the UI we strip out the systemDir
					logger.info(`systemDir ${systemDir()}`);
					logger.info(`workinDir ${workingDirectory}`);
					if (join(workingDirectory, sophiaDirName) !== systemDir()) {
						workingDirectory = join(systemDir(), workingDirectory);
					}
					logger.info(`Setting working directory to ${workingDirectory}`);
					getFileSystem().setWorkingDirectory(workingDirectory);
					logger.info(`Working directory is ${getFileSystem().getWorkingDirectory()}`);

					response = await codebaseQuery(query);
				});

				reply.send({ response });
			} catch (error) {
				logger.error(error, 'Error running codebase query');
				reply.status(500).send(error.message);
			}
		},
	);

	fastify.post(
		'/api/code/select-files',
		{
			schema: {
				body: Type.Object({
					workingDirectory: Type.String(),
					requirements: Type.String(),
				}),
			},
		},
		(request, reply) => {
			const { workingDirectory, requirements } = request.body as { workingDirectory: string; requirements: string };
			try {
				const config: RunAgentConfig = {
					agentName: `Select Files: ${requirements}`,
					llms: ClaudeVertexLLMs(),
					functions: [],
					initialPrompt: '',
					humanInLoop: {
						budget: 2,
					},
				};

				let response: SelectFilesResponse;
				runAgentWorkflow(config, async () => {
					if (workingDirectory?.trim()) getFileSystem().setWorkingDirectory(workingDirectory);
					response = await selectFilesToEdit(requirements);
				})
					.then(() => {
						reply.send(response);
					})
					.catch((error) => {
						logger.error(error, 'Error running select files to edit');
						reply.status(500).send(error.message);
					});
			} catch (error) {
				logger.error(error, 'Error running select files to edit');
				reply.status(500).send(error.message);
			}
		},
	);

	fastify.get('/api/code/repositories', async (request, reply) => {
		try {
			const workingDirectory = process.cwd();
			const gitlabRepos = findRepositories(path.join(systemDir(), 'gitlab'));
			const githubRepos = findRepositories(path.join(systemDir(), 'github'));

			const allRepos = [
				workingDirectory,
				...gitlabRepos.map((path) => path.replace(systemDir(), '.')),
				...githubRepos.map((path) => path.replace(systemDir(), '.')),
			];

			reply.send(allRepos);
		} catch (error) {
			logger.error(error, 'Error fetching repositories');
			reply.status(500).send({ error: 'Internal Server Error' });
		}
	});
}
