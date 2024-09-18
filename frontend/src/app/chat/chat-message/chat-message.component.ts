import { Component, Input, OnInit } from '@angular/core';
import { LlmMessage, User } from '@app/chat/model/chat';
import { MarkdownService } from 'ngx-markdown';

@Component({
  selector: 'app-chat-message',
  templateUrl: './chat-message.component.html',
  styleUrls: ['./chat-message.component.scss'],
})
export class ChatMessageComponent implements OnInit {
  @Input() msg: LlmMessage = {} as LlmMessage;
  @Input() predecessor: LlmMessage | null = null;
  @Input() allowsReply = false;

  constructor(private markdown: MarkdownService) {}

  ngOnInit() {}

  getDateDivider(msg: LlmMessage | undefined): string {
    if (!msg || !msg.createdAt) {
      return '';
    }
    return new Date(msg.createdAt).toLocaleDateString();
  }

  getUserName(role: 'system' | 'user' | 'assistant'): string {
    switch (role) {
      case 'user':
        return 'You';
      case 'assistant':
        return 'Assistant';
      case 'system':
        return 'System';
      default:
        return 'Unknown';
    }
  }

  getCreatedDate(msg: LlmMessage): string | null {
    if (!msg.createdAt) {
      return null;
    }
    return new Date(msg.createdAt).toLocaleTimeString();
  }

  isPredecessorSameAuthor(): boolean {
    if (!this.predecessor) {
      return false;
    }
    return this.predecessor.role === this.msg.role;
  }

  isTemporalClose(): boolean {
    if (!this.predecessor || !this.msg.createdAt || !this.predecessor.createdAt) {
      return false;
    }
    const timeDiff = Math.abs(this.msg.createdAt - this.predecessor.createdAt);
    return timeDiff <= 60000; // 1 minute in milliseconds
  }

  isPreviousMessageFromOtherDay() {
    if (!this.predecessor || !this.msg.createdAt || !this.predecessor.createdAt) {
      return true;
    }
    const prevDate = new Date(this.predecessor.createdAt).toDateString();
    const currentDate = new Date(this.msg.createdAt).toDateString();
    return prevDate !== currentDate;
  }
}
