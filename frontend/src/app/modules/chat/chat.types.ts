import {AiMessage} from "./ai.types";

/** Server API chat data type */
export interface ServerChat {
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
/** Server API chat message data type */
export type LlmMessage = AiMessage & {
    /** The LLM which generated the text (only when role=assistant) */
    llmId?: string;
    /** Set the cache_control flag with Claude models */
    cache?: 'ephemeral';
    /** Time the message was sent */
    time?: number;
};

/** Chat UI data type */
export interface Chat {
    id: string;
    title: string;
    contactId?: string;
    unreadCount?: number;
    lastMessage?: string;
    lastMessageAt?: string;
    updatedAt: number;
    messages?: ChatMessage[];
}

export interface ChatMessage {
    id?: string;
    isMine?: boolean;
    content?: string;
    llmId?: string;
    createdAt?: string;
    generating?: boolean;
    /** Attachments to be sent with the next message */
    attachments?: Attachment[];
}

export interface Attachment {
    type: 'file' | 'image';
    /** File name */
    filename: string;
    /** File size in bytes */
    size: number;
    /** The actual file data */
    data: File;
    /** Mime type of the file. */
    mimeType: string;
    /** Optional preview URL for thumbnails etc */
    previewUrl?: string;
}
