

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  text: string;
  /** Set the cache_control flag with Claude models */
  cache?: 'ephemeral';
  index: number
}

export interface Chat {
  id: string;
  userId: string;
  visibility: 'private' | 'public';
  title: string;
  updatedAt: number;
  /** When a chat is branched from the original thread by deleting/updating messages etc */
  parentId: undefined | string;
  messages: LlmMessage[];
}

export type ChatPreview = Omit<Chat, 'messages'>;

export interface ChatList {
  chats: ChatPreview[];
  hasMore: boolean;
}
