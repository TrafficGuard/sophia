import { randomUUID } from 'crypto';
import { MultipartFile } from '@fastify/multipart';
import { Type } from '@sinclair/typebox';
import { UserContent } from 'ai';
import { FastifyRequest } from 'fastify';
import { Chat, ChatList } from '#chat/chatTypes';
import { send, sendBadRequest } from '#fastify/index';
import { FilePartExt, ImagePartExt, LLM, UserContentExt } from '#llm/llm';
import { getLLM } from '#llm/llmFactory';
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
			const userId = currentUser().id;
			const chat: Chat = await fastify.chatService.loadChat(chatId);
			if (chat.userId !== userId) {
				return sendBadRequest(reply, 'Unauthorized to view this chat');
			}
			send(reply, 200, chat);
		},
	);

	fastify.post(`${basePath}/chat/new`, {}, async (req, reply) => {
		const { llmId, userContent } = await extractMessage(req);

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

		let llm: LLM;
		try {
			llm = getLLM(llmId);
		} catch (e) {
			return sendBadRequest(reply, `No LLM for ${llmId}`);
		}
		if (!llm.isConfigured()) return sendBadRequest(reply, `LLM ${llm.getId()} is not configured`);

		const text = typeof userContent === 'string' ? userContent : userContent.find((content) => content.type === 'text')?.text;
		const titlePromise: Promise<string> | undefined = llm.generateText(
			'The following message is the first message in a new chat conversation. Your task is to create a short title for the conversation. Respond only with the title, nothing else',
			text,
		);

		chat.messages.push({ role: 'user', content: userContent, time: Date.now() }); //, cache: cache ? 'ephemeral' : undefined // remove any previous cache marker

		const generatedMessage = await llm.generateText(chat.messages);
		chat.messages.push({ role: 'assistant', content: generatedMessage, llmId: llmId, time: Date.now() });

		if (titlePromise) chat.title = await titlePromise;

		chat = await fastify.chatService.saveChat(chat);

		send(reply, 200, chat);
	});
	fastify.post(
		`${basePath}/chat/:chatId/send`,
		{
			schema: {
				params: Type.Object({
					chatId: Type.String(),
				}),
			},
		},
		async (req, reply) => {
			const { chatId } = req.params;

			const { llmId, userContent } = await extractMessage(req);

			const chat: Chat = await fastify.chatService.loadChat(chatId);

			let llm: LLM;
			try {
				llm = getLLM(llmId);
			} catch (e) {
				return sendBadRequest(reply, `Cannot find LLM ${llm.getId()}`);
			}
			if (!llm.isConfigured()) return sendBadRequest(reply, `LLM ${llm.getId()} is not configured`);

			chat.messages.push({ role: 'user', content: userContent, time: Date.now() });

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

/**
 * Extracts the chat message properties and attachments from the request
 * @param req
 */
async function extractMessage(req: FastifyRequest<any>): Promise<{ llmId: string; userContent: UserContent }> {
	const parts = req.parts();

	let text: string;
	let llmId: string;
	const attachments: Array<FilePartExt | ImagePartExt> = [];

	for await (const part of parts) {
		if (part.type === 'file') {
			const file = part as MultipartFile;
			const data = await file.toBuffer();

			if (file.mimetype.startsWith('image/')) {
				attachments.push({
					type: 'image',
					filename: file.filename,
					size: data.length,
					image: data.toString('base64'),
					mimeType: file.mimetype,
				});
			} else {
				attachments.push({
					type: 'file',
					filename: file.filename,
					size: data.length,
					data: data.toString('base64'),
					mimeType: file.mimetype,
				});
			}
		} else if (part.type === 'field') {
			if (part.fieldname === 'text') {
				text = part.value as string;
			} else if (part.fieldname === 'llmId') {
				llmId = part.value as string;
			}
		}
	}
	return { llmId, userContent: toUserContent(text, attachments) };
}

/**
 * Converts a text message and attachments from the UI to the UserContentExt type stored in the database
 * @param message
 * @param attachments
 */
export function toUserContent(message: string, attachments: Array<FilePartExt | ImagePartExt>): UserContent {
	if (!attachments) return message;

	const userContent: UserContentExt = [];

	for (const attachment of attachments) {
		if (attachment.type === 'file') {
			userContent.push({
				type: 'file',
				data: attachment.data,
				mimeType: attachment.mimeType, // mimeType is required for files
				filename: attachment.filename,
				size: attachment.size,
			});
		} else if (attachment.type === 'image') {
			userContent.push({
				type: 'image',
				image: attachment.image,
				mimeType: attachment.mimeType, // mimeType is optional for images
				filename: attachment.filename,
				size: attachment.size,
			});
		} else {
			throw new Error('Invalid attachment type');
		}
	}

	userContent.push({
		type: 'text',
		text: message,
	});
	return userContent;
}
