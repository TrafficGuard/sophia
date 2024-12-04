import { randomUUID } from 'crypto';
import { Type } from '@sinclair/typebox';
import { Chat, ChatList } from '#chat/chatTypes';
import { send, sendBadRequest } from '#fastify/index';
import { LLM } from '#llm/llm';
import { getLLM } from '#llm/llmFactory';
import { Claude3_5_Sonnet_Vertex } from '#llm/services/anthropic-vertex';
import { GPT4oMini } from '#llm/services/openai';
import { logger } from '#o11y/logger';
import { currentUser } from '#user/userService/userContext';
import { AppFastifyInstance } from '../../server';

const basePath = '/api';

export async function chatRoutes(fastify: AppFastifyInstance) {
	fastify.get(
		`${basePath}/chat/:chatId`,
		{
			schema: {
				params: Type.Object({
					chatId: Type.String(),
				}),
			},
		},
		async (req, reply) => {
			const { chatId } = req.params;
			const chat: Chat = await fastify.chatService.loadChat(chatId);
			send(reply, 200, chat);
		},
	);
	fastify.post(
		`${basePath}/chat/new`,
		{
			schema: {
				body: Type.Object({
					text: Type.String(),
					llmId: Type.String(),
					cache: Type.Optional(Type.Boolean()),
					temperature: Type.Optional(Type.Number()),
				}),
			},
		},
		async (req, reply) => {
			const { text, llmId, cache } = req.body;

			let chat: Chat = {
				id: randomUUID(),
				messages: [],
				title: '',
				updatedAt: Date.now(),
				userId: currentUser().id,
				visibility: 'private',
				parentId: undefined,
				rootId: undefined,
			};

			let llm: LLM = getLLM(Claude3_5_Sonnet_Vertex().getId());
			try {
				llm = getLLM(llmId);
			} catch (e) {
				logger.error(`No LLM for ${llmId}`);
			}
			if (!llm.isConfigured()) return sendBadRequest(reply, `LLM ${llm.getId()} is not configured`);

			let titleLLM = llm;
			if (llm.getModel().startsWith('o1')) {
				// o1 series don't yet support system prompts
				titleLLM = GPT4oMini();
			}
			const titlePromise: Promise<string> | undefined = titleLLM.generateText(
				'The following message is the first message in a new chat conversation. Your task is to create a short title for the conversation. Respond only with the title, nothing else',
				text,
			);

			chat.messages.push({ role: 'user', content: text, time: Date.now() }); //, cache: cache ? 'ephemeral' : undefined // remove any previous cache marker

			const generatedMessage = await llm.generateText(chat.messages);
			chat.messages.push({ role: 'assistant', content: generatedMessage, llmId: llmId, time: Date.now() });

			if (titlePromise) chat.title = await titlePromise;

			chat = await fastify.chatService.saveChat(chat);

			send(reply, 200, chat);
		},
	);
	fastify.post(
		`${basePath}/chat/:chatId/send`,
		{
			schema: {
				params: Type.Object({
					chatId: Type.String(),
				}),
				body: Type.Object({
					text: Type.String(),
					llmId: Type.String(),
					cache: Type.Optional(Type.Boolean()),
					temperature: Type.Optional(Type.Number()),
				}),
			},
		},
		async (req, reply) => {
			const { chatId } = req.params; // Extract 'chatId' from path parameters
			const { text, llmId, cache } = req.body;

			const chat: Chat = await fastify.chatService.loadChat(chatId);

			let llm: LLM = getLLM(Claude3_5_Sonnet_Vertex().getId());
			try {
				llm = getLLM(llmId);
			} catch (e) {
				logger.error(`No LLM for ${llmId}`);
			}
			if (!llm.isConfigured()) return sendBadRequest(reply, `LLM ${llm.getId()} is not configured`);

			chat.messages.push({ role: 'user', content: text, time: Date.now() }); //, cache: cache ? 'ephemeral' : undefined // remove any previous cache marker

			const generatedMessage = await llm.generateText(chat.messages);
			chat.messages.push({ role: 'assistant', content: generatedMessage, llmId, time: Date.now() });

			await fastify.chatService.saveChat(chat);

			send(reply, 200, generatedMessage);
		},
	);
	fastify.get(
		`${basePath}/chats`,
		{
			schema: {
				params: Type.Object({
					startAfterId: Type.Optional(Type.String()),
				}),
			},
		},
		async (req, reply) => {
			const { startAfterId } = req.params;
			const chats: ChatList = await fastify.chatService.listChats(startAfterId);
			send(reply, 200, chats);
		},
	);
	fastify.delete(
		`${basePath}/chat/:chatId`,
		{
			schema: {
				params: Type.Object({
					chatId: Type.String(),
				}),
			},
		},
		async (req, reply) => {
			const { chatId } = req.params;
			const userId = currentUser().id;
			try {
				const chat = await fastify.chatService.loadChat(chatId);
				if (chat.userId !== userId) {
					return sendBadRequest(reply, 'Unauthorized to delete this chat');
				}
				await fastify.chatService.deleteChat(chatId);
				send(reply, 200, { success: true });
			} catch (error) {
				logger.error(`Failed to delete chat ${chatId}:`, error);
				send(reply, 500, { error: 'Failed to delete chat' });
			}
		},
	);
}
