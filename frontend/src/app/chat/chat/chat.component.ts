import { Component, OnInit, Input, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
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
export class ChatComponent implements OnInit, AfterViewChecked {
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
  }

  private scrollToBottomIfNeeded() {
    console.log('scrollToBottomIfNeeded')
    if (this.shouldScrollToBottom && this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      const atBottom = element.scrollHeight - element.scrollTop === element.clientHeight;

      if (atBottom) {
        element.scrollTop = element.scrollHeight;
        this.shouldScrollToBottom = false;
      }
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
