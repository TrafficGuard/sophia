export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  text: string;
  llmId?: string;
  /** Set the cache_control flag with Claude models */
  cache?: 'ephemeral';
  index: number;
  createdAt?: number;
}

export interface User {
  displayName: string;
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
