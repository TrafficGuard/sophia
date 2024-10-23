
export interface LlmMessage {
    role: 'system' | 'user' | 'assistant';
    text: string;
    /** The LLM which generated the text (only when role=assistant) */
    llmId?: string;
    /** Set the cache_control flag with Claude models */
    cache?: 'ephemeral';
    time?: number;
}

export interface AssistantChat {
    id: string;
    title: string;
    contactId?: string;
    unreadCount?: number;
    lastMessage?: string;
    lastMessageAt?: string;
    messages?: {
        id?: string;
        chatId?: string;
        contactId?: string;
        isMine?: boolean;
        value?: string;
        llmId?: string;
        createdAt?: string;
    }[];
}
