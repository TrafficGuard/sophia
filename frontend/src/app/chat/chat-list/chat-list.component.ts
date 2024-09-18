import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';

import { MatDialogModule } from '@angular/material/dialog';
import { ApiChatService } from '@app/chat/services/api/api-chat.service';
import { ChatList } from '@app/chat/model/chat';

@Component({
  selector: 'app-code-chat-list',
  templateUrl: './chat-list.component.html',
  styleUrls: ['./chat-list.component.scss'],
})
export class ChatListComponent implements OnInit {
  chats: ChatList | null = null;
  isLoading = false;
  errorMessage = '';

  constructor(private chatService: ApiChatService, private router: Router, private dialog: MatDialog) {}

  ngOnInit() {
    this.loadChats();
  }

  loadChats() {
    this.isLoading = true;
    this.chatService.list().subscribe(
      (chats) => {
        console.log(chats);
        this.chats = chats.data;
        this.isLoading = false;
      },
      (error: any) => {
        console.log(error);
        this.errorMessage = 'Error loading configurations';
        this.isLoading = false;
      }
    );
  }

  openChat(chatId?: string) {
    this.router.navigate(['/chat', chatId]).catch(console.error);
  }

  // confirmDelete(config: CodeReviewConfig) {
  //   const dialogRef = this.dialog.open(ConfirmDialogComponent, {
  //     width: '400px',
  //     data: { title: 'Confirm Deletion', message: `Are you sure you want to delete "${config.description}"?` },
  //   });
  //
  //   dialogRef.afterClosed().subscribe((result) => {
  //     if (result) {
  //       this.deleteConfig(config.id);
  //     }
  //   });
  // }
  //
  // private deleteConfig(id: string) {
  //   this.codeReviewService.deleteCodeReviewConfig(id).subscribe(
  //     () => this.loadConfigs(),
  //     (error) => {
  //       this.errorMessage = 'Error deleting configuration';
  //     }
  //   );
  // }
}
