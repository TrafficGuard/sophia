import { Injectable } from '@angular/core';
import { ChatBaseService } from '../chat-base.service';
import { Message } from '../../model/message';
import { Chat } from '../../model/chat';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiChatService extends ChatBaseService {
  constructor() {
    super();
  }

  async create(): Promise<boolean> {
    return false;
  }

  async deleteIsTyping(chatId: string): Promise<void> {
    return undefined;
  }

  async deleteMessage(chat: Chat, msg: Message): Promise<void> {
    return undefined;
  }

  getHistory(chatId: string): Observable<any> {
    return new Observable<any>();
  }

  async sendIsTyping(chatId: string): Promise<void> {}

  async sendMessage(chatId: string, content: string): Promise<void> {}

  buildChat(source: Observable<any>) {}
}
