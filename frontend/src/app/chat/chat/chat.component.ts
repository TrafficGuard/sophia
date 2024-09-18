import { Component, OnInit, Input, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Chat, LlmMessage } from '@app/chat/model/chat';
import { ApiChatService } from '@app/chat/services/api/api-chat.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnInit {
  @Input() height: string = '';
  @Input() width: string = '';
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  user: any = {};

  chat$: BehaviorSubject<Chat> = new BehaviorSubject<Chat>({
    id: 'new',
    updatedAt: 0,
    messages: [],
    title: '',
    userId: '',
    parentId: undefined,
    visibility: 'private',
  });

  constructor(private route: ActivatedRoute, private chatService: ApiChatService) {}

  ngOnInit() {
    const chatId: string | null = this.route.snapshot.paramMap.get('id');
    if (!chatId || chatId === 'new') {
      console.log('new chat!');
      this.scrollToBottom();
    } else {
      this.chatService
        .getChat(chatId)
        .pipe(map((data: any) => data.data))
        .subscribe((chat: Chat) => {
          this.chat$.next(chat);
          this.scrollToBottom();
        });
    }
  }

  trackByCreated(index: number, msg: LlmMessage) {
    return msg.index;
  }

  onMessageSent(messages: LlmMessage[]) {
    console.log(messages);
    console.log(messages[0]);
    console.log(messages[1]);
    const currentChat = this.chat$.value;
    messages[0].index = currentChat.messages.length;
    messages[1].index = currentChat.messages.length + 1;
    currentChat.messages.push(messages[0]);
    currentChat.messages.push(messages[1]);
    this.chat$.next(currentChat);
    this.scrollToBottom();
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    }, 100);
  }
}
