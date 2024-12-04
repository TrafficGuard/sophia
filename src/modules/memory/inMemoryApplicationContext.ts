import { ChatService } from '#chat/chatTypes';
import { InMemoryAgentStateService } from '#modules/memory/inMemoryAgentStateService';
import { InMemoryCodeReviewService } from '#modules/memory/inMemoryCodeReviewService';
import { InMemoryFunctionCacheService } from '#modules/memory/inMemoryFunctionCacheService';
import { InMemoryLlmCallService } from '#modules/memory/inMemoryLlmCallService';
import { InMemoryUserService } from '#modules/memory/inMemoryUserService';
import { ApplicationContext } from '../../applicationContext';

export function inMemoryApplicationContext(): ApplicationContext {
	return {
		agentStateService: new InMemoryAgentStateService(),
		chatService: {} as ChatService, // TODO implement
		userService: new InMemoryUserService(),
		llmCallService: new InMemoryLlmCallService(),
		codeReviewService: new InMemoryCodeReviewService(),
		functionCacheService: new InMemoryFunctionCacheService(),
	};
}
