import { LlmMessage } from '#llm/llm';

export interface Chat {
	id: string;
	/** When a chat is branched from the original thread by deleting/updating messages etc */
	parentId?: string;
	messages: LlmMessage[];
}

export interface ChatService {
	loadChat(chatId: string): Promise<Chat>;
	saveChat(chatId: string, messages: LlmMessage[]): Promise<Chat>;
}
