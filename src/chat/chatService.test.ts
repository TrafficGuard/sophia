import { expect } from 'chai';
import { Chat, ChatService } from '#chat/chatTypes';

export function runChatServiceTests(createService: () => ChatService) {
	let service: ChatService;

	beforeEach(() => {
		service = createService();
	});

	it('should save and load a chat', async () => {
		const sampleChat: Chat = {
			id: 'test-chat-id',
			messages: [
				{ role: 'user', text: 'Hello' },
				{ role: 'assistant', text: 'Hi there! How can I help you?' },
			],
			parentId: undefined,
		};

		// Save the chat
		const savedChat = await service.saveChat(sampleChat);

		// Load the chat
		const loadedChat = await service.loadChat(sampleChat.id);

		// Verify that the loaded chat matches the saved chat
		expect(loadedChat).to.deep.equal(savedChat);
		expect(loadedChat).to.deep.equal(sampleChat);
	});

	it('should save a chat with an empty message array', async () => {
		const emptyChatId = 'empty-chat-id';
		const emptyChat: Chat = {
			id: emptyChatId,
			messages: [],
			parentId: undefined,
		};

		const savedChat = await service.saveChat(emptyChat);
		expect(savedChat).to.deep.equal(emptyChat);

		const loadedChat = await service.loadChat(emptyChatId);
		expect(loadedChat).to.deep.equal(emptyChat);
	});

	it('should handle a chat with parentId', async () => {
		const parentChat: Chat = {
			id: 'parent-chat-id',
			messages: [{ role: 'user', text: 'Parent message' }],
			parentId: undefined,
		};

		const childChat: Chat = {
			id: 'child-chat-id',
			parentId: parentChat.id,
			messages: [{ role: 'assistant', text: 'Child message' }],
		};

		await service.saveChat(parentChat);
		await service.saveChat(childChat);

		const loadedChildChat = await service.loadChat(childChat.id);
		expect(loadedChildChat).to.deep.equal(childChat);
	});
}
