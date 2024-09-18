import { Chat } from '../model/chat';
import { Observable } from 'rxjs';
import { ServicesConfig } from './services-config';
import { Injectable, Optional } from '@angular/core';

export abstract class ChatBaseService {
  constructor(@Optional() config?: ServicesConfig) {
    if (config) {
      console.log('Config:', config);
    }
  }

  abstract getChat(chatId: string): Observable<any>;

  // abstract create(): Promise<boolean>;
  //
  // abstract sendMessage(chatId: string, content: string): Promise<void>;
  //
  // abstract deleteMessage(chat: Chat, msg: Message): Promise<void>;
  //
  // abstract sendIsTyping(chatId: string): Promise<void>;
  //
  // abstract deleteIsTyping(chatId: string): Promise<void>;
  //
  // abstract buildChat(source: Observable<any>) ;
}
