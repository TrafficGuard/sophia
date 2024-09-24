import { runChatServiceTests } from '#chat/chatService.test';
import { FirestoreChatService } from '#firestore/firestoreChatService';
import { resetFirestoreEmulator } from '#firestore/resetFirestoreEmulator';

describe('FirestoreChatService', () => {
	runChatServiceTests(() => new FirestoreChatService(), resetFirestoreEmulator);
});
