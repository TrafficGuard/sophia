import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';

import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { debounceTime, filter, throttleTime } from 'rxjs/operators';
import { ApiChatService } from '@app/chat/services/api/api-chat.service';
import { LlmMessage } from '@app/chat/model/chat';

@Component({
  selector: 'app-chat-controls',
  templateUrl: './chat-controls.component.html',
  styleUrls: ['./chat-controls.component.scss'],
})
export class ChatControlsComponent implements OnInit {
  @Input() chatId: string = '';
  @Output() messageSent = new EventEmitter<LlmMessage[]>();

  messageControl: FormControl;
  chatForm: FormGroup;
  isSending: boolean = false;
  llms: { id: string; name: string; isConfigured: boolean }[] = [];
  selectedLlmId: string = '';

  constructor(private chatService: ApiChatService, private fb: FormBuilder) {
    this.messageControl = new FormControl();
    this.chatForm = this.fb.group({ message: this.messageControl });
  }

  ngOnInit() {
    this.scrollBottom();
    this.fetchLlms();

    this.messageControl.valueChanges
      .pipe(
        filter((data) => data !== ''),
        throttleTime(1400)
      )
      .subscribe((data) => {
        // Implement typing indicator if needed
      });

    this.messageControl.valueChanges
      .pipe(
        filter((data) => data !== ''),
        debounceTime(1500)
      )
      .subscribe((data) => {
        // Implement typing indicator removal if needed
      });
  }

  private fetchLlms(): void {
    this.chatService.getLlmList().subscribe(
      (data) => {
        this.llms = data.data;
        if (this.llms.length > 0) {
          this.selectedLlmId = this.llms[0].id;
        }
      },
      (error) => {
        console.error('Error fetching LLMs:', error);
      }
    );
  }

  submit(): void {
    const msg = this.messageControl.value;
    if (!msg) {
      return alert('Please enter a message.');
    }
    if (!this.selectedLlmId) {
      return alert('Please select an LLM.');
    }

    this.isSending = true;
    this.chatService.sendMessage(this.chatId, msg, this.selectedLlmId).subscribe(
      (data: any) => {
        console.log(data.data);
        this.isSending = false;
        this.messageControl.reset();
        this.scrollBottom();
        this.messageSent.emit([
          { role: 'user', text: msg, index: -1 },
          { role: 'assistant', text: data.data, index: -1 },
        ]);
      },
      (err: any) => {
        console.error('Error sending message:', err);
        this.isSending = false;
        alert('Failed to send message. Please try again.');
      }
    );
  }

  private scrollBottom(): void {
    setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 500);
  }

  // Attachment methods left as placeholders for future implementation
  setSelectedFiles(event: any): void {}
  deleteAttachment(file: any): void {}
  getAttachments(): File[] {
    return [];
  }
  hasAttachments() {
    return false;
  }
}
