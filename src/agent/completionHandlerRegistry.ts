import { ConsoleCompletedHandler } from '#agent/agentCompletion';
import { AgentCompleted } from '#agent/agentContextTypes';
import { SlackChatBotService } from '#modules/slack/slackChatBotService';
import { logger } from '#o11y/logger';

const handlers = [ConsoleCompletedHandler, SlackChatBotService];

/**
 * Return the AgentCompleted callback object from its id.
 * @param handlerId
 */
export function getCompletedHandler(handlerId: string): AgentCompleted | null {
	if (!handlerId) return new ConsoleCompletedHandler();

	for (const handlerCtor of handlers) {
		const handler = new handlerCtor();
		if (handlerId === handler.agentCompletedHandlerId()) return handler;
	}
	logger.error(`No AgentCompleted handler found for id ${handlerId}`);
	return null;
}
