import { Component, Input, OnInit, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { debounceTime, filter, throttleTime } from 'rxjs/operators';
import { ApiChatService } from '@app/chat/services/api/api-chat.service';
import { LlmService } from '@app/shared/services/llm.service';
import { LlmMessage } from '@app/chat/model/chat';
import { Data } from '@shared';

@Component({
  selector: 'app-chat-controls',
  templateUrl: './chat-controls.component.html',
  styleUrls: ['./chat-controls.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatControlsComponent implements OnInit {
  @Input() chatId: string = '';
  @Output() messageSent = new EventEmitter<LlmMessage[]>();
  @Output() chatError = new EventEmitter<string>();

  chatForm: FormGroup;
  isSending: boolean = false;
  llms: any[] = [];

  constructor(private chatService: ApiChatService, private llmService: LlmService, private fb: FormBuilder) {
    this.chatForm = this.fb.group({
      message: [''],
      selectedLlm: [''],
    });
  }

  ngOnInit() {
    this.scrollBottom();
    this.fetchLlms();

    this.chatForm
      .get('message')
      ?.valueChanges.pipe(
        filter((data: string) => data !== ''),
        throttleTime(1400)
      )
      .subscribe(() => {
        // Implement typing indicator if needed
      });

    this.chatForm
      .get('message')
      ?.valueChanges.pipe(
        filter((data: string) => data !== ''),
        debounceTime(1500)
      )
      .subscribe(() => {
        // Implement typing indicator removal if needed
      });
  }

  private fetchLlms(): void {
    this.llmService.getLlms().subscribe({
      next: (llms) => {
        this.llms = llms;
        if (this.llms.length > 0) {
          this.chatForm.get('selectedLlm')?.setValue(this.llms[0].id);
        }
      },
      error: (error) => {
        console.error('Error fetching LLMs:', error);
        // Consider showing a user-friendly error message here
      },
    });
  }

  submit(): void {
    console.log('Submit method called'); // Debug log
    const msg = this.chatForm.get('message')?.value;
    const selectedLlmId = this.chatForm.get('selectedLlm')?.value;

    if (!this.chatId) {
      console.error('Chat ID is not set');
      this.chatError.emit('Unable to send message. Please try again later.');
      return;
    }

    if (!msg) {
      this.chatError.emit('Please enter a message.');
      return;
    }
    if (!selectedLlmId) {
      this.chatError.emit('Please select an LLM.');
      return;
    }

    this.isSending = true;
    this.chatService.sendMessage(this.chatId, msg, selectedLlmId).subscribe({
      next: (data: Data<string>) => {
        console.log(data.data);
        this.isSending = false;
        this.chatForm.get('message')?.reset();
        this.scrollBottom();
        this.messageSent.emit([
          { role: 'user', text: msg, index: -1 },
          { role: 'assistant', text: data.data, index: -1, llmId: selectedLlmId },
        ]);
      },
      error: (err: Error) => {
        console.error('Error sending message:', err);
        this.isSending = false;
        this.chatError.emit('Failed to send message. Please try again.');
      },
    });
  }

  private scrollBottom(): void {
    setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 500);
  }

  // Attachment methods left as placeholders for future implementation
  setSelectedFiles(event: Event): void {}
  deleteAttachment(file: File): void {}
  getAttachments(): File[] {
    return [];
  }
  hasAttachments(): boolean {
    return false;
  }
}
