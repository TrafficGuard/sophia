import { Injectable } from '@angular/core';
import { Chat, ChatList } from '../../model/chat';
import { Observable } from 'rxjs';
import { Data } from '@shared';
import { HttpClient } from '@angular/common/http';

// Service client for the chat routes

@Injectable({
  providedIn: 'root',
})
export class ApiChatService {
  // extends ChatBaseService
  constructor(private http: HttpClient) {
    // super();
  }

  async create(): Promise<boolean> {
    return false;
  }

  // async deleteMessage(chat: Chat, msg: Message): Promise<void> {
  //   return undefined;
  // }

  list(startAfterId?: string): Observable<Data<ChatList>> {
    return this.http.get<Data<ChatList>>(`/chats`); // { params: {startAfterId} }
  }

  getChat(chatId: string): Observable<Data<Chat>> {
    return this.http.get<Data<Chat>>(`/chat/${chatId}`);
  }

  sendMessage(chatId: string, content: string, llmId: string): Observable<Data<string>> {
    return this.http.post<Data<string>>(`/chat/${chatId}/send`, { text: content, llmId });
  }
}
