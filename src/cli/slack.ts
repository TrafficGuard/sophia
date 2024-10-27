import { ClaudeLLMs } from '#llm/services/anthropic';
import { ClaudeVertexLLMs } from '#llm/services/anthropic-vertex';
import { SlackChatBotService } from '#modules/slack/slackChatBotService';
import { sleep } from '#utils/async-utils';
import { initFirestoreApplicationContext } from '../app';

async function main() {
	if (process.env.GCLOUD_PROJECT) {
		await initFirestoreApplicationContext();
	}
	const chatbot = new SlackChatBotService();
	await chatbot.initSlack();
	await sleep(60000);
}

main().then(() => console.log('done'), console.error);
