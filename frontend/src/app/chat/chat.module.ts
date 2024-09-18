import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FlexLayoutModule } from '@angular/flex-layout';

import { MaterialModule } from '@app/material.module';
import { ChatRoutingModule } from '@app/chat/chat-routing.module';
import { ChatComponent } from './chat/chat.component';
import { ChatControlsComponent } from './chat-controls/chat-controls.component';
import { ChatMessageComponent } from './chat-message/chat-message.component';
import { ChatHeaderComponent } from './chat-header/chat-header.component';
import { ChatListComponent } from '@app/chat/chat-list/chat-list.component';
import { MarkdownModule } from 'ngx-markdown';

@NgModule({
  imports: [
    CommonModule,
    TranslateModule,
    FlexLayoutModule,
    MaterialModule,
    ChatRoutingModule,
    MarkdownModule.forChild(),
  ],
  declarations: [ChatComponent, ChatControlsComponent, ChatMessageComponent, ChatHeaderComponent, ChatListComponent],
})
export class ChatModule {}
