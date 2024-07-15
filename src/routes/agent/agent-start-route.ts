import { readFileSync } from 'fs';
import { Type } from '@sinclair/typebox';
import { LlmFunctions } from '#agent/LlmFunctions';
import { send } from '#fastify/index';
import { getLLM } from '#llm/llmFactory';
import { logger } from '#o11y/logger';
import { AppFastifyInstance } from '../../app';

import { startAgent } from '#agent/agentRunner';
import { currentUser } from '#user/userService/userContext';
import { functionFactory } from '../../functionDefinition/functionDecorators';

const v1BasePath = '/api/agent/v1';
export async function agentStartRoute(fastify: AppFastifyInstance) {
	/** Starts a new agent */
	fastify.post(
		`${v1BasePath}/start`,
		{
			schema: {
				body: Type.Object({
					name: Type.String(),
					userPrompt: Type.String(),
					functions: Type.Array(Type.String()),
					type: Type.String({ enum: ['xml', 'python'] }),
					budget: Type.Number({ minimum: 0 }),
					count: Type.Integer({ minimum: 0 }),
					llmEasy: Type.String(),
					llmMedium: Type.String(),
					llmHard: Type.String(),
				}),
			},
		},
		async (req, reply) => {
			const { name, userPrompt, functions, type, budget, count, llmEasy, llmMedium, llmHard } = req.body;

			logger.info(req.body, `Starting agent ${name}`);

			logger.info(Object.keys(functionFactory));
			const llmFunctions = new LlmFunctions();
			for (const functionClassName of functions) {
				const functionClass = functionFactory[functionClassName];
				if (!functionClass) {
					logger.error(`Function class ${functionClassName} not found in the functionFactory`);
				} else {
					llmFunctions.addFunctionClass(functionFactory[functionClassName]);
				}
			}

			startAgent({
				user: currentUser(),
				agentName: name,
				initialPrompt: userPrompt,
				type,
				humanInLoop: { budget, count },
				llms: {
					easy: getLLM(llmEasy),
					medium: getLLM(llmMedium),
					hard: getLLM(llmHard),
					xhard: getLLM(llmHard),
				},
				functions: llmFunctions,
			});

			send(reply, 200);
		},
	);
}
