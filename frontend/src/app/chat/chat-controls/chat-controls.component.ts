import { Component, Input, OnInit } from '@angular/core';

import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { debounceTime, filter, throttleTime } from 'rxjs/operators';
import {ApiChatService} from "@app/chat/services/api/api-chat.service";

@Component({
  selector: 'app-chat-controls',
  templateUrl: './chat-controls.component.html',
  styleUrls: ['./chat-controls.component.scss'],
})
export class ChatControlsComponent implements OnInit {
  @Input() chatId: string = '';

  messageControl: FormControl;
  chatForm: FormGroup;

  constructor(
    // private attachmentService: FirebaseAttachmentService,
    // private chatService: FirebaseChatService,
    private chatService: ApiChatService,
    private fb: FormBuilder
  ) {
    this.messageControl = new FormControl();
    this.chatForm = this.fb.group({ message: this.messageControl });
  }

  ngOnInit() {
    this.scrollBottom();

    this.messageControl.valueChanges
      .pipe(
        filter((data) => data !== ''),
        throttleTime(1400)
      )
      .subscribe((data) => {
        // this.chatService.sendIsTyping(this.chatId).then();
      });

    this.messageControl.valueChanges
      .pipe(
        filter((data) => data !== ''),
        debounceTime(1500)
      )
      .subscribe((data) => {
        // this.chatService.deleteIsTyping(this.chatId).then();
      });
  }

  submit(): void {
    const msg = this.messageControl.value;
    if (!msg) {
      return alert('Please enter a message.');
    }

    // TODO emit the sent message and reply to the parent
    this.chatService.sendMessage(this.chatId, msg, 'llmIdPlaceholder').subscribe(
          (res: any) => console.log(res),
          (err: any) => console.log(err)
      );
    // this.attachmentService.uploadAttachments().subscribe(
    //     (res: any) => console.log(res),
    //     (err: any) => console.log(err)
    // );
    this.messageControl.reset();
    this.scrollBottom();
  }

  private scrollBottom(): void {
    setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 500);
  }

  setSelectedFiles(event: any): void {
    // this.attachmentService.setSelectedFiles(event);
  }

  deleteAttachment(file: any): void {
    // return this.attachmentService.deleteFile(file);
  }

  getAttachments(): File[] {
    // return this.attachmentService.getFiles();
    return [];
  }

  hasAttachments() {
    // return this.attachmentService.getFiles().length > 0;
    false;
  }
}
