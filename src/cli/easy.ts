import '#fastify/trace-init/trace-init'; // leave an empty line next so this doesn't get sorted from the first line

import { readFileSync, writeFileSync } from 'fs';
import { appendFileSync } from 'node:fs';
import { agentContext, agentContextStorage, createContext } from '#agent/agentContextLocalStorage';
import { AgentContext } from '#agent/agentContextTypes';
import { Blueberry } from '#llm/multi-agent/blueberry';
import { mockLLMs } from '#llm/services/mock-llm';
import { Gemini_1_5_Flash } from '#llm/services/vertexai';
import { initFirestoreApplicationContext } from '../app';
import { parseProcessArgs } from './cli';

// See https://arxiv.org/html/2405.19616v1 https://github.com/autogenai/easy-problems-that-llms-get-wrong
// Usage:
// npm run easy

async function main() {
	if (process.env.GCLOUD_PROJECT) await initFirestoreApplicationContext();

	const context: AgentContext = createContext({
		initialPrompt: '',
		agentName: 'easy',
		llms: mockLLMs(),
		functions: [],
	});
	agentContextStorage.enterWith(context);

	let questions = JSON.parse(readFileSync('bench/datasets/easy-problems-that-llm-get-wrong/aggregatedResults.json').toString());

	questions = Object.values(questions).filter((q: any) => q.score === 0);

	questions = Object.values(questions).filter((q: any) => q.level_0 < 30);

	questions.forEach((question) => console.log(question.level_0));
	console.log(`${questions.length} questions with score 0`);

	// writeFileSync('easy.jsonl', '');
	const flash = Gemini_1_5_Flash();
	let lastCost = 0;
	const blueberry = new Blueberry();
	for (const question of questions) {
		try {
			console.log(`Question ${question.level_0}`);
			const response = await blueberry.generateText(question.multi_choice_question);
			const answer = await flash.generateText(
				`<response>${response}</response>\nFor the above response extract the letter of the multiple choice answer (A, B, C or D) and respond only with the single character.`,
			);
			console.log(`Answer: ${answer}`);

			const cost = agentContext().cost - lastCost;
			lastCost = agentContext().cost;
			console.log(`Cost: ${cost}`);
			appendFileSync('easy.jsonl', `${JSON.stringify({ index: question.index, correct: answer === question.correct_letter, answer, response })}\n`);
		} catch (e) {
			console.error(`Error with question ${question}`);
		}
	}

	// writeFileSync('src/cli/easy-out', text);
	//
	// console.log(text);
	console.log('Wrote output to src/cli/easy-out');
	console.log(`Cost USD$${agentContext().cost.toFixed(2)}`);
}

main()
	.then(() => {
		console.log('done');
	})
	.catch((e) => {
		console.error(e);
	});
