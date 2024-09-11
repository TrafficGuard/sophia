import { runChatServiceTests } from '#chat/chatService.test';
import { FirestoreChatService } from '#firestore/firestoreChatService';

describe('FirestoreChatService', () => {
	runChatServiceTests(() => new FirestoreChatService());
});
