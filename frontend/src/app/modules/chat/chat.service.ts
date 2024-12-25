import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Attachment, Chat, ChatMessage, LlmMessage, ServerChat } from 'app/modules/chat/chat.types';
import {
    BehaviorSubject,
    Observable,
    filter,
    map,
    of,
    switchMap,
    take,
    tap,
    throwError, catchError,
} from 'rxjs';
import { FilePart, ImagePart, TextPart } from './ai.types';

@Injectable({ providedIn: 'root' })
export class ChatService {
    private _chat: BehaviorSubject<Chat> = new BehaviorSubject(null);
    private _chats: BehaviorSubject<Chat[]> = new BehaviorSubject(null);

    /**
     * Constructor
     */
    constructor(private _httpClient: HttpClient) {
        this.getChats();
    }

    private base64ToBlob(base64: string, mimeType: string): Blob {
        const byteCharacters = atob(base64);
        const byteArrays = [];

        const sliceSize = 512;
        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);

            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }

            const byteArray = new Uint8Array(byteNumbers);

            byteArrays.push(byteArray);
        }

        return new Blob(byteArrays, { type: mimeType });
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Getter for chat
     */
    get chat$(): Observable<Chat> {
        return this._chat.asObservable();
    }

    /**
     * Getter for chats
     */
    get chats$(): Observable<Chat[]> {
        return this._chats.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get chats
     */
    getChats(): Observable<any> {
        return this._httpClient.get<Chat[]>('/api/chats').pipe(
            tap((response: Chat[]) => {
                response = (response as any).data.chats
                this._chats.next(response);
            })
        );
    }

    createChat(message: string, llmId: string, attachments?: Attachment[]): Observable<Chat> {
        const formData = new FormData();
        formData.append('text', message);
        formData.append('llmId', llmId);

        if (attachments && attachments.length > 0) {
            attachments.forEach((attachment, index) => {
                formData.append(`attachments[${index}]`, attachment.data, attachment.filename);
            });
        }

        return this._httpClient.post<any>('/api/chat/new', formData, { headers: { 'enctype': 'multipart/form-data' } }).pipe(
            map((response: any) => {
                const newChat: Chat = response.data;
                const currentChats = this._chats.value || [];
                this._chats.next([newChat, ...currentChats]);
                return newChat;
            })
        );
    }

    deleteChat(chatId: string): Observable<void> {
        return this._httpClient.delete<void>(`/api/chat/${chatId}`).pipe(
            tap(() => {
                const currentChats = this._chats.value || [];
                this._chats.next(currentChats.filter(chat => chat.id !== chatId));
                if (this._chat.getValue().id === chatId) {
                    this._chat.next(null);
                }
            })
        );
    }

    /**
     * Get chat
     *
     * @param id
     */
    getChatById(id: string): Observable<any> {
        if(!id?.trim() || id === 'new') {
            const chat: Chat = { messages:[], id: 'new', title: '', updatedAt: Date.now() }
            this._chat.next(chat);
            return this._chats
        }
        return this._httpClient
            .get<Chat>(`api/chat/${id}`)
            .pipe(
                map((response: any) => {
                    // Update the chat
                    const serverChat: ServerChat = response.data

                    const chat: Chat = {
                        id: serverChat.id,
                        title: serverChat.title,
                        messages: serverChat.messages.map(llmMessage => {

                            let textContent = '';
                            let attachments: Attachment[] = [];
                            // Check if content is an array
                            if (Array.isArray(llmMessage.content)) {
                                // Find the index of the item with type 'text'
                                const textIndex = llmMessage.content.findIndex(item => item.type === 'text');
                                if (textIndex !== -1) {
                                    // Remove the 'text' item from the content array
                                    const textPart = llmMessage.content.splice(textIndex, 1)[0] as TextPart;
                                    // Set the 'text' content on the 'content' property
                                    textContent = textPart.text ?? '';
                                }

                                // Convert the FilePart and ImageParts to Attachments
                                attachments = llmMessage.content
                                    .filter(item => item.type === 'image' || item.type === 'file')
                                    .map(item => {
                                        if (item.type === 'image') {
                                            const imagePart = item as ImagePart;

                                            const mimeType = imagePart.mimeType || 'image/png';
                                            const base64Data = imagePart.image as string;
                                            const filename = imagePart.filename || `image_${Date.now()}.png`;

                                            // Create a data URL
                                            const dataUrl = `data:${mimeType};base64,${base64Data}`;

                                            return {
                                                type: 'image',
                                                filename: filename,
                                                size: base64Data.length,
                                                data: null,
                                                mimeType: mimeType,
                                                previewUrl: dataUrl,
                                            } as Attachment;
                                        } else if (item.type === 'file') {
                                            const filePart = item as FilePart;

                                            const mimeType = filePart.mimeType || 'application/octet-stream';
                                            const base64Data = filePart.data as string;
                                            const filename = filePart.filename || `file_${Date.now()}`;

                                            // Create a data URL
                                            const dataUrl = `data:${mimeType};base64,${base64Data}`;

                                            return {
                                                type: 'file',
                                                filename: filename,
                                                size: base64Data.length,
                                                data: null,
                                                mimeType: mimeType,
                                                previewUrl: dataUrl,
                                            } as Attachment;
                                        }
                                    });
                            } else {
                                textContent = llmMessage.content ?? '';
                            }

                            const uiMsg: ChatMessage = {
                                id: serverChat.id,
                                content: textContent,
                                isMine: llmMessage.role === 'user',
                                createdAt: new Date(llmMessage.time).toString(),
                                llmId: llmMessage.llmId,
                                attachments
                            };

                            return uiMsg;
                        }),
                        updatedAt: serverChat.updatedAt
                    }

                    // Set lastMessage
                    const lastMessage = chat.messages[chat.messages.length - 1];
                    chat.lastMessage = lastMessage ? lastMessage.content : '';

                    // this._chats doesn't have the messages, so we need to update it when we load a chat
                    const chats = this._chats.getValue()
                    const chatIndex = chats.findIndex(chat => chat.id === id);
                    chats[chatIndex] = chat;
                    this._chats.next(chats);

                    this._chat.next(chat);

                    // Return the chat
                    return chat;
                }),
                switchMap((chat: Chat) => {
                    if (!chat) {
                        return throwError(
                            'Could not found chat with id of ' + id + '!'
                        );
                    }

                    return of(chat);
                })
            );
    }

    /**
     * Update chat
     *
     * @param id
     * @param chat
     */
    updateChat(id: string, chat: Chat): Observable<Chat> {
        return this.chats$.pipe(
            take(1),
            switchMap((chats) =>
                this._httpClient
                    .patch<Chat>('api/chat/chat', {
                        id,
                        chat,
                    })
                    .pipe(
                        map((updatedChat) => {
                            // Find the index of the updated chat
                            const index = chats.findIndex(
                                (item) => item.id === id
                            );

                            // Update the chat
                            chats[index] = updatedChat;

                            // Update the chats
                            this._chats.next(chats);

                            // Return the updated contact
                            return updatedChat;
                        }),
                        switchMap((updatedChat) =>
                            this.chat$.pipe(
                                take(1),
                                filter((item) => item && item.id === id),
                                tap(() => {
                                    // Update the chat if it's selected
                                    this._chat.next(updatedChat);

                                    // Return the updated chat
                                    return updatedChat;
                                })
                            )
                        )
                    )
            )
        );
    }


    /**
     * Reset the selected chat
     */
    resetChat(): void {
        this._chat.next(null);
    }


    /**
     * Send a message
     *
     * @param chatId
     * @param message
     * @param llmId LLM identifier
     * @param attachments
     */
    sendMessage(chatId: string, message: string, llmId: string, attachments?: Attachment[]): Observable<Chat> {
        const formData = new FormData();
        formData.append('text', message);
        formData.append('llmId', llmId);

        if (attachments && attachments.length > 0) {
            attachments.forEach((attachment, index) => {
                formData.append(`attachments[${index}]`, attachment.data, attachment.filename);
            });
        }

        return this.chats$.pipe(
            take(1),
            switchMap((chats) =>
                this._httpClient
                    .post<Chat>(`/api/chat/${chatId}/send`, formData, { headers: { 'enctype': 'multipart/form-data' } })
                    .pipe(
                        map((data: any) => {
                            const llmMessage = data.data;

                            const newMessages: ChatMessage[] = [
                                {
                                    content: message,
                                    isMine: true,
                                    attachments: attachments,
                                },
                                {
                                    content: llmMessage,
                                    isMine: false,
                                },
                            ]
                            // Find the index of the updated chat
                            const index = chats.findIndex(
                                (item) => item.id === chatId
                            );
                            if(index < 0) {
                                console.log(`Couldn't find chat with id ${chatId} from ${chats.length} chats`);
                            }

                            // Update the chat
                            const chat = chats[index];
                            if(chat.messages === null || chat.messages === undefined) {
                                console.log(`nullish messages for ${JSON.stringify(chat)} at index ${index}`)
                                chat.messages = []
                            }
                            chat.messages.push(...newMessages);

                            // Move the chat to the top of the list
                            chats.splice(index, 1);
                            chats.unshift(chat);

                            // Update the chats
                            this._chats.next(chats);

                            // Update the chat if it's selected
                            this._chat.next(chat);

                            // Return the updated chat
                            return chat;
                        })
                    )
            )
        );
    }

    /**
     *
     * @param chatId
     * @param message
     * @param llmId
     */
    regenerateMessage(chatId: string, message: string, llmId: string): Observable<Chat> {
        if (!chatId?.trim() || !message?.trim() || !llmId?.trim()) {
            return throwError(() => new Error('Invalid parameters for regeneration'));
        }

        return this.chats$.pipe(
            take(1),
            switchMap((chats) => {
                const chatIndex = chats.findIndex(item => item.id === chatId);
                if (chatIndex === -1) {
                    return throwError(() => new Error(`Chat not found: ${chatId}`));
                }

                return this._httpClient
                    .post<Chat>(`/api/chat/${chatId}/regenerate`, { text: message, llmId })
                    .pipe(
                        map((data: any) => {
                            const llmMessage = data.data;
                            const newMessage = {
                                value: llmMessage,
                                isMine: false,
                                llmId: llmId,
                            };

                            const chat = chats[chatIndex];
                            chat.messages.push(newMessage);
                            chat.lastMessage = llmMessage;

                            // Update states
                            this._chats.next(chats);
                            this._chat.next(chat);

                            return chat;
                        }),
                        catchError(error => {
                            console.error('Error regenerating message:', error);
                            return throwError(() => new Error('Failed to regenerate message'));
                        })
                    );
            })
        );
    }

    sendAudioMessage(chatId: string, llmId: string, audio: Blob): Observable<Chat> {
        return this.chats$.pipe(
            take(1),
            switchMap((chats) =>
                this._httpClient
                    .post<Chat>(`/api/chat/${chatId}/send`, { audio: audio, llmId })
                    .pipe(
                        map((data: any) => {
                            const llmMessage = data.data;

                            // const newMessages = [
                            //     {
                            //         value: message,
                            //         isMine: true,
                            //     },
                            //     {
                            //         value: llmMessage,
                            //         isMine: false,
                            //     },
                            // ]
                            // // Find the index of the updated chat
                            const index = chats.findIndex(
                                (item) => item.id === chatId
                            );
                            //
                            // // Update the chat
                            const chat =  chats[index];
                            // chat.messages.push(...newMessages);
                            // // Update the chats
                            this._chats.next(chats);
                            //
                            // // Update the chat if it's selected
                            this._chat.next(chat);
                            //
                            // // Return the updated chat
                            return chat;
                        })
                    )
            )
        );
    }

    private getExtensionFromMimeType(mimeType: string): string {
        const mimeTypeMap: { [key: string]: string } = {
            'application/pdf': 'pdf',
            'text/plain': 'txt',
            'application/msword': 'doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
            'image/jpeg': 'jpeg',
            'image/png': 'png',
            // Add other mime types and their extensions as needed
        };
        return mimeTypeMap[mimeType] || 'bin'; // Default to 'bin' if mime type is unknown
    }
}
