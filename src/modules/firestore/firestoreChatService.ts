import { Firestore } from '@google-cloud/firestore';
import { Chat, ChatPreview, ChatService } from '#chat/chatTypes';
import { logger } from '#o11y/logger';
import { span } from '#o11y/trace';
import { currentUser } from '#user/userService/userContext';
import { firestoreDb } from './firestore';

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
			const chat: Chat = {
				id: chatId,
				userId: data.userId,
				title: data.title,
				lastUpdated: data.lastUpdated,
				visibility: data.visibility,
				parentId: data.parentId,
				messages: data.messages,
			};
			if (chat.visibility !== 'private' && chat.userId !== currentUser().id) {
				throw new Error('Chat not visible.');
			}
			return chat;
		} catch (error) {
			logger.error(error, `Error loading chat ${chatId}`);
			throw error;
		}
	}

	@span()
	async saveChat(chat: Chat): Promise<Chat> {
		try {
			const docRef = this.db.doc(`Chats/${chat.id}`);

			await docRef.set(chat, { merge: true });
			return chat;
		} catch (error) {
			logger.error(error, `Error saving chat ${chat.id}`);
			throw error;
		}
	}

	@span()
	async listChats(startAfterId?: string, limit = 50): Promise<{ chats: ChatPreview[]; hasMore: boolean }> {
		try {
			const userId = currentUser().id;
			let query = this.db
				.collection('Chats')
				.where('userId', '==', userId)
				.orderBy('createdAt', 'desc')
				.limit(limit + 1);

			if (startAfterId) {
				const startAfterDoc = await this.db.collection('Chats').doc(startAfterId).get();
				if (startAfterDoc.exists) {
					query = query.startAfter(startAfterDoc);
				}
			}

			const querySnapshot = await query.get();

			const chats: Omit<Chat, 'messages'>[] = [];
			let hasMore = false;

			querySnapshot.forEach((doc) => {
				if (chats.length < limit) {
					const data = doc.data();
					chats.push({
						id: doc.id,
						userId: data.userId,
						title: data.title,
						lastUpdated: data.lastUpdated,
						visibility: data.visibility,
						parentId: data.parentId,
					});
				} else {
					hasMore = true;
				}
			});

			return { chats, hasMore };
		} catch (error) {
			logger.error(error, 'Error listing chats');
			throw error;
		}
	}
}
