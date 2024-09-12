import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Chat, LlmMessage } from '@app/chat/model/chat';
import { ApiChatService } from "@app/chat/services/api/api-chat.service";

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnInit {
  @Input() height: string = '';
  @Input() width: string = '';

  user: any = {};

  chat$: BehaviorSubject<Chat> = new BehaviorSubject<Chat>({
    id: 'new',
    lastUpdated: 0,
    messages: [],
    title: '',
    userId: '',
    parentId: undefined,
    visibility: 'private'
  });

  messages: LlmMessage[] = [];

  constructor(
    private route: ActivatedRoute,
    private chatService: ApiChatService,
  ) {}

  ngOnInit() {
    const chatId: string | null = this.route.snapshot.paramMap.get('id');
    if (!chatId || chatId === 'new') {
      this.messages = [];
      console.log('new chat!');
    } else {
      this.chatService.getChat(chatId).pipe(
        map(data => data.data)
      ).subscribe(chat => {
        this.chat$.next(chat);
        this.messages = chat.messages;
      });
    }
  }

  trackByCreated(index: number, msg: LlmMessage) {
    return msg.index;
  }

  onMessageSent(message: any) {
    const currentChat = this.chat$.value;
    currentChat.messages.push(message);
    this.chat$.next(currentChat);
    this.messages = currentChat.messages;
    this.scrollBottom();

    // Refresh the chat from the server
    if (currentChat.id !== 'new') {
      this.chatService.getChat(currentChat.id).pipe(
        map(data => data.data)
      ).subscribe(updatedChat => {
        this.chat$.next(updatedChat);
        this.messages = updatedChat.messages;
      });
    }
  }

  private scrollBottom() {
    setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 500);
  }
}
