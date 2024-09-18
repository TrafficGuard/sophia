import { Component, OnInit, Input, ViewChild, ElementRef, AfterViewChecked, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { Chat, LlmMessage } from '@app/chat/model/chat';
import { ApiChatService } from '@app/chat/services/api/api-chat.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnInit, AfterViewChecked, AfterViewInit {
  @Input() height: string = '';
  @Input() width: string = '';
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  chat$: BehaviorSubject<Chat> = new BehaviorSubject<Chat>({
    id: 'new',
    updatedAt: 0,
    messages: [],
    title: '',
    userId: '',
    parentId: undefined,
    visibility: 'private',
  });

  private shouldScrollToBottom = true;
  private initialChatLoaded = false;

  constructor(private route: ActivatedRoute, private chatService: ApiChatService) {}

  ngOnInit() {
    const chatId: string | null = this.route.snapshot.paramMap.get('id');
    if (!chatId || chatId === 'new') {
      console.log('new chat!');
      this.initialChatLoaded = true;
    } else {
      this.chatService
        .getChat(chatId)
        .pipe(map((data: any) => data.data))
        .subscribe((chat: Chat) => {
          this.chat$.next(chat);
          this.initialChatLoaded = true;
          this.scrollToBottom();
        });
    }
  }

  ngAfterViewInit() {
    if (this.initialChatLoaded) {
      this.scrollToBottom();
    }
  }

  ngAfterViewChecked() {
    console.log('ngAfterViewChecked')
    this.scrollToBottomIfNeeded();
  }

  trackByCreated(index: number, msg: LlmMessage) {
    return msg.index;
  }

  onMessageSent(messages: LlmMessage[]) {
    const currentChat = this.chat$.value;
    messages[0].index = currentChat.messages.length;
    messages[1].index = currentChat.messages.length + 1;
    currentChat.messages.push(messages[0], messages[1]);
    this.chat$.next(currentChat);
    this.shouldScrollToBottom = true;
    setTimeout(() => this.scrollToBottom(), 0);
  }

  private scrollToBottomIfNeeded() {
    if (this.shouldScrollToBottom && this.messagesContainer) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private scrollToBottom() {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  // Listen for scroll events to determine if we should auto-scroll on new messages
  onScroll() {
    console.log('onScroll')
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      const atBottom = element.scrollHeight - element.scrollTop === element.clientHeight;
      this.shouldScrollToBottom = atBottom;
    }
  }
}
