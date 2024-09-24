import { expect } from 'chai';
import { Chat, ChatService } from '#chat/chatTypes';

import { SINGLE_USER_ID } from '#user/userService/inMemoryUserService';

export function runChatServiceTests(createService: () => ChatService, beforeEachHook: () => Promise<void> | void = () => {}) {
	let service: ChatService;

	beforeEach(async () => {
		service = createService();
		await beforeEachHook();
	});

	it('should save and load a chat', async () => {
		const sampleChat: Chat = {
			id: 'test-chat-id',
			messages: [
				{ role: 'user', text: 'Hello' },
				{ role: 'assistant', text: 'Hi there! How can I help you?' },
			],
			updatedAt: Date.now(),
			userId: SINGLE_USER_ID,
			visibility: 'private',
			title: 'test',
			parentId: undefined,
			rootId: undefined,
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
			userId: SINGLE_USER_ID,
			title: 'test',
			visibility: 'private',
			messages: [],
			updatedAt: Date.now(),
			parentId: undefined,
			rootId: undefined,
		};

		const savedChat = await service.saveChat(emptyChat);
		expect(savedChat).to.deep.equal(emptyChat);

		const loadedChat = await service.loadChat(emptyChatId);
		expect(loadedChat).to.deep.equal(emptyChat);
	});

	it('should handle a chat with parentId', async () => {
		const parentChat: Chat = {
			id: 'parent-chat-id',
			userId: SINGLE_USER_ID,
			visibility: 'private',
			title: 'test',
			messages: [{ role: 'user', text: 'Parent message' }],
			updatedAt: Date.now(),
			parentId: undefined,
			rootId: undefined,
		};

		const childChat: Chat = {
			id: 'child-chat-id',
			userId: SINGLE_USER_ID,
			visibility: 'private',
			parentId: parentChat.id,
			rootId: parentChat.id,
			title: 'test',
			updatedAt: Date.now(),
			messages: [{ role: 'assistant', text: 'Child message' }],
		};

		await service.saveChat(parentChat);
		await service.saveChat(childChat);

		const loadedChildChat = await service.loadChat(childChat.id);
		expect(loadedChildChat).to.deep.equal(childChat);
	});

	describe('listChats', () => {
		it('should list chats with pagination', async () => {
			const chats: Chat[] = [
				{
					id: 'chat1',
					userId: SINGLE_USER_ID,
					title: 'Chat 1',
					visibility: 'private',
					messages: [],
					parentId: undefined,
					rootId: undefined,
					updatedAt: Date.now(),
				},
				{
					id: 'chat2',
					userId: SINGLE_USER_ID,
					title: 'Chat 2',
					visibility: 'private',
					messages: [],
					parentId: undefined,
					rootId: undefined,
					updatedAt: Date.now(),
				},
				{
					id: 'chat3',
					userId: SINGLE_USER_ID,
					title: 'Chat 3',
					visibility: 'private',
					messages: [],
					parentId: undefined,
					rootId: undefined,
					updatedAt: Date.now(),
				},
			];

			for (const chat of chats) {
				await service.saveChat(chat);
			}

			const listAllResult = await service.listChats();
			expect(listAllResult.chats).to.have.lengthOf(3);
			expect(listAllResult.hasMore).to.be.false;

			const limitResult = await service.listChats('aaa', 2);
			expect(limitResult.chats).to.have.lengthOf(2);
			expect(limitResult.hasMore).to.be.true;

			const pagedResult = await service.listChats('chat2', 2);
			expect(pagedResult.chats).to.have.lengthOf(1);
			expect(pagedResult.hasMore).to.be.false;
		});

		it('should return an empty array when no chats are available', async () => {
			const result = await service.listChats();
			expect(result.chats).to.be.an('array').that.is.empty;
			expect(result.hasMore).to.be.false;
		});
	});
}
