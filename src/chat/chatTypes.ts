import { LlmMessage } from '#llm/llm';

export interface Chat {
	id: string;
	userId: string;
	visibility: 'private' | 'public';
	title: string;
	updatedAt: number;
	/** When a chat is branched from the original thread by deleting/updating messages etc */
	parentId: undefined | string;
	/** The original parent */
	rootId: undefined | string;
	messages: LlmMessage[];
}

export type ChatPreview = Omit<Chat, 'messages'>;

export interface ChatList {
	chats: ChatPreview[];
	hasMore: boolean;
}

/**
 * The service only handle persistence of the Chat objects.
 */
export interface ChatService {
	listChats(startAfter?: string, limit?: number): Promise<ChatList>;
	loadChat(chatId: string): Promise<Chat>;
	saveChat(chat: Chat): Promise<Chat>;
}
