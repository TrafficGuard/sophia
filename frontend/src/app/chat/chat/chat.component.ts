import { Component, OnInit, Input, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { map, takeUntil, debounceTime } from 'rxjs/operators';
import { Chat, LlmMessage } from '@app/chat/model/chat';
import { ApiChatService } from '@app/chat/services/api/api-chat.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnInit, OnDestroy {
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
  private destroy$ = new Subject<void>();
  private scrollEvent$ = new Subject<void>();

  constructor(private route: ActivatedRoute, private chatService: ApiChatService) {}

  ngOnInit() {
    const chatId: string | null = this.route.snapshot.paramMap.get('id');
    if (!chatId || chatId === 'new') {
      setTimeout(() => this.scrollToBottom(), 0);
    } else {
      this.chatService
        .getChat(chatId)
        .pipe(
          map((data: any) => data.data),
          takeUntil(this.destroy$)
        )
        .subscribe({
          next: (chat: Chat) => {
            this.chat$.next(chat);
            setTimeout(() => this.scrollToBottom(), 0);
          },
          error: (error) => {
            console.error('Error loading chat:', error);
            // Handle error (e.g., show error message to user)
          },
        });
    }

    this.scrollEvent$.pipe(debounceTime(200), takeUntil(this.destroy$)).subscribe(() => this.checkScrollPosition());
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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

  private scrollToBottom() {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  onScroll() {
    this.scrollEvent$.next();
  }

  private checkScrollPosition() {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      const atBottom = element.scrollHeight - element.scrollTop === element.clientHeight;
      this.shouldScrollToBottom = atBottom;
    }
  }
}
