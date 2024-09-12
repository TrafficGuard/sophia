import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {Observable, of} from 'rxjs';
import {map} from 'rxjs/operators';
import {Chat, LlmMessage} from '@app/chat/model/chat';
import {ApiChatService} from "@app/chat/services/api/api-chat.service";

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnInit {
  @Input() height: string = '';
  @Input() width: string = '';

  user: any = {};

  chat$?: Observable<Chat>;

  messages: LlmMessage[] = [];

  constructor(
    private route: ActivatedRoute,
    private chatService: ApiChatService,
  ) {}

  ngOnInit() {
    const chatId: string | null = this.route.snapshot.paramMap.get('id');
    if (!chatId || chatId === 'new') {
      this.messages = []
      this.chat$ = of({id: 'new', lastUpdated: 0, messages: [], title: '', userId: '', parentId: undefined, visibility: 'private'})
      console.log('new chat!')
    } else {
      this.chat$ = this.chatService.getChat(chatId).pipe(map(data => data.data))
    }
  }

  trackByCreated(index: number, msg: LlmMessage) {
    return msg.index;
  }

  private scrollBottom() {
    setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 500);
  }
}
