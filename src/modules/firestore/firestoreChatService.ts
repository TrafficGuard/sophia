import { Firestore } from '@google-cloud/firestore';
import { Chat, ChatService } from '#chat/chatTypes';
import { LlmMessage } from '#llm/llm';
import { logger } from '#o11y/logger';
import { span } from '#o11y/trace';
import { firestoreDb } from '../../firestore';

/**
 * Google Firestore implementation of ChatService
 */
export class FirestoreChatService implements ChatService {
	private db: Firestore;

	constructor() {
		this.db = firestoreDb();
	}

	@span()
	async loadChat(chatId: string): Promise<Chat> {
		try {
			const docRef = this.db.doc(`Chats/${chatId}`);
			const docSnap = await docRef.get();

			if (!docSnap.exists) {
				logger.warn(`Chat with id ${chatId} not found`);
				throw new Error(`Chat with id ${chatId} not found`);
			}

			const data = docSnap.data();
			return {
				id: chatId,
				parentId: data.parentId,
				messages: data.messages,
			};
		} catch (error) {
			logger.error(error, `Error loading chat ${chatId}`);
			throw error;
		}
	}

	@span()
	async saveChat(chatId: string, messages: LlmMessage[]): Promise<Chat> {
		try {
			const docRef = this.db.doc(`Chats/${chatId}`);
			const chat: Chat = {
				id: chatId,
				messages,
			};

			await docRef.set(chat, { merge: true });
			return chat;
		} catch (error) {
			logger.error(error, `Error saving chat ${chatId}`);
			throw error;
		}
	}
}
