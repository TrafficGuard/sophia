import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ChatComponent } from './chat/chat.component';
import {ChatListComponent} from "@app/chat/chat-list/chat-list.component";

const routes: Routes = [
  {
    path: '',
    component: ChatListComponent,
  },
  {
    path: ':id',
    component: ChatComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [],
})
export class ChatRoutingModule {}
