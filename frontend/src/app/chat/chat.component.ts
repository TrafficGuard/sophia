import { Component, OnInit, Input } from '@angular/core';
import { FirebaseChatService } from './services/firebase/firebase-chat.service';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
// import { FirebaseAuthService } from './services/firebase/firebase-auth.service';
import { Message } from './model/message';
import { Chat } from '@app/chat/model/chat';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnInit {
  @Input() height: string = '';
  @Input() width: string = '';

  user: any = {};

  chat$?: Observable<any>;

  messages: Message[] = [];

  constructor(
    public chatService: FirebaseChatService,
    private route: ActivatedRoute // public auth: FirebaseAuthService
  ) {}

  ngOnInit() {
    const chatId: string | null = this.route.snapshot.paramMap.get('id');
    if (!chatId) return;
    // TODO: first load already existing history
    // TODO: listen on changes
    const source = this.chatService.getHistory(chatId);
    // this.chat$ = this.chatService.buildChat(source).pipe(
    //   tap(res => this.integrateNewMessages(res)),
    //   tap(() => this.scrollBottom())
    // );
  }

  private integrateNewMessages(chat: Chat) {
    const newMessages = chat.messages.filter(
      (newMessage: Message) => !this.messages.some((message: Message) => this.isSameMessage(message, newMessage))
    );
    newMessages.forEach((msg) => this.messages.push(msg));
  }

  private isSameMessage(message: Message, newMessage: Message): boolean {
    return (
      message.content === newMessage.content &&
      message.uid === newMessage.uid &&
      message.createdAt === newMessage.createdAt
    );
  }

  trackByCreated(index: number, msg: Message) {
    return msg.createdAt;
  }

  private scrollBottom() {
    setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 500);
  }
}
