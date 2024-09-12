import { Type } from '@sinclair/typebox';
import { Chat, ChatList } from '#chat/chatTypes.ts';
import { send, sendBadRequest } from '#fastify/index';
import { getLLM } from '#llm/llmFactory.ts';
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
			const chat: Chat = await fastify.chatService.loadChat(chatId);

			const llm = getLLM(llmId);

			if (!llm.isConfigured()) return sendBadRequest(reply, 'LLM is not configured');

			chat.messages.push({ role: 'user', text: text }); //, cache: cache ? 'ephemeral' : undefined // remove any previous cache marker

			const response = await llm.generateText2(chat.messages);
			chat.messages.push({ role: 'assistant', text: response });
			await fastify.chatService.saveChat(chat);

			send(reply, 200, chat);
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
