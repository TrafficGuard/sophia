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

  create(): Promise<boolean> {
    return undefined;
  }

  deleteIsTyping(chatId: string): Promise<void> {
    return undefined;
  }

  deleteMessage(chat: Chat, msg: Message): Promise<void> {
    return undefined;
  }

  getHistory(chatId: string): Observable<any> {
    return undefined;
  }

  sendIsTyping(chatId: string): Promise<void> {
    return undefined;
  }

  sendMessage(chatId: string, content: string): Promise<void> {
    return undefined;
  }

  buildChat(source: Observable<any>) {}
}
