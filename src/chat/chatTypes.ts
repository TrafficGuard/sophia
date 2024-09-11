import { LlmMessage } from '#llm/llm';

export interface Chat {
	id: string;
	/** When a chat is branched from the original thread by deleting/updating messages etc */
	parentId: undefined | string;
	messages: LlmMessage[];
}

export interface ChatService {
	loadChat(chatId: string): Promise<Chat>;
	saveChat(chat: Chat): Promise<Chat>;
}
