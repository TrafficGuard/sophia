import { randomUUID } from 'crypto';
import { Type } from '@sinclair/typebox';
import { Chat, ChatList } from '#chat/chatTypes';
import { send, sendBadRequest } from '#fastify/index';
import { LLM } from '#llm/llm';
import { getLLM } from '#llm/llmFactory';
import { Claude3_5_Sonnet_Vertex } from '#llm/models/anthropic-vertex';
import { logger } from '#o11y/logger';
import { currentUser } from '#user/userService/userContext';
import { AppFastifyInstance } from '../../app';

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

			const isNew = chatId === 'new';
			const chat: Chat = isNew
				? {
						id: randomUUID(),
						messages: [],
						title: '',
						updatedAt: Date.now(),
						userId: currentUser().id,
						visibility: 'private',
						parentId: undefined,
						rootId: undefined,
				  }
				: await fastify.chatService.loadChat(chatId);

			let llm: LLM = getLLM(Claude3_5_Sonnet_Vertex().getId());
			try {
				llm = getLLM(llmId);
			} catch (e) {
				logger.error(`No LLM for ${llmId}`);
			}
			if (!llm.isConfigured()) return sendBadRequest(reply, `LLM ${llm.getId()} is not configured`);

			const titlePromise: Promise<string> | undefined = isNew
				? llm.generateText(
						text,
						'The following message is the first message in a new chat conversation. Your task is to create a short title for the conversation. Respond only with the title, nothing else',
				  )
				: undefined;

			chat.messages.push({ role: 'user', text: text }); //, cache: cache ? 'ephemeral' : undefined // remove any previous cache marker

			const generatedMessage = await llm.generateTextFromMessages(chat.messages);
			chat.messages.push({ role: 'assistant', text: generatedMessage });

			if (titlePromise) chat.title = await titlePromise;

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
}
