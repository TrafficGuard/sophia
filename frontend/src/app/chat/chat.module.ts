import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FlexLayoutModule } from '@angular/flex-layout';

import { MaterialModule } from '@app/material.module';
import { ChatRoutingModule } from '@app/chat/chat-routing.module';
import { ChatComponent } from '@app/chat/chat.component';
import { ChatControlsComponent } from '@app/chat/chat-controls/chat-controls.component';
import { ChatMessageComponent } from '@app/chat/chat-message/chat-message.component';
import { ChatHeaderComponent } from '@app/chat/chat-header/chat-header.component';

@NgModule({
  imports: [CommonModule, TranslateModule, FlexLayoutModule, MaterialModule, ChatRoutingModule],
  declarations: [ChatComponent, ChatControlsComponent, ChatMessageComponent, ChatHeaderComponent],
})
export class ChatModule {}
