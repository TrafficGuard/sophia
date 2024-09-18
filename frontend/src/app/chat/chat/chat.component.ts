import { Component, OnInit, Input } from '@angular/core';
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
    } else {
      this.chatService
        .getChat(chatId)
        .pipe(map((data: any) => data.data))
        .subscribe((chat: Chat) => {
          this.chat$.next(chat);
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
    // this.messages.push(messages[0]);
    // this.messages.push(messages[1]);
    this.chat$.next(currentChat);
    // this.messages = currentChat.messages;
    this.scrollBottom();

    // Refresh the chat from the server
    // if (currentChat.id !== 'new') {
    //   this.chatService.getChat(currentChat.id).pipe(
    //     map((data: any) => data.data)
    //   ).subscribe((updatedChat: Chat) => {
    //     this.chat$.next(updatedChat);
    //     this.messages = updatedChat.messages;
    //   });
    // }
  }

  private scrollBottom() {
    setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 500);
  }
}
