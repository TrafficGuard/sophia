import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {Chat, ChatMessage, LlmMessage} from 'app/modules/admin/apps/chat/chat.types';
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

    createChat(message: string, llmId: string): Observable<Chat> {
        return this._httpClient.post<any>('/api/chat/new', { text: message, llmId }).pipe(
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
            console.log(`new or nullish chat id "${id}"`)
            const chat: Chat = {messages:[], id: 'new', title: '', updatedAt: Date.now() }
            this._chat.next(chat);
            return this._chats
        }
        return this._httpClient
            .get<Chat>(`api/chat/${id}`)
            .pipe(
                map((chat: Chat) => {
                    // Update the chat
                    chat = (chat as any).data

                    chat = {
                        id: chat.id,
                        lastMessage: (chat.messages[chat.messages.length - 1] as any).text,
                        title: chat.title,
                        messages: chat.messages.map(msg => {
                            const llmMsg = msg as LlmMessage
                            return {
                                ...msg,
                                value: llmMsg.content,
                                isMine: llmMsg.role === 'user'
                            }
                        }),
                        updatedAt: chat.updatedAt
                    }
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
                    // chat = (chat as any).data
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
        console.log('chat.service resetChat')
        this._chat.next(null);
    }


    /**
     * Send a message
     *
     * @param chatId
     * @param message
     * @param llmId LLM identifier
     */
    sendMessage(chatId: string, message: string, llmId: string): Observable<Chat> {
        return this.chats$.pipe(
            take(1),
            switchMap((chats) =>
                this._httpClient
                    .post<Chat>(`/api/chat/${chatId}/send`, { text: message, llmId })
                    .pipe(
                        map((data: any) => {
                            const llmMessage = data.data;

                            const newMessages: ChatMessage[] = [
                                {
                                    content: message,
                                    isMine: true,
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
}
