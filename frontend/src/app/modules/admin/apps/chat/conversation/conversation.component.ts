import {TextFieldModule} from '@angular/cdk/text-field';
import {AsyncPipe, DatePipe, NgClass, NgTemplateOutlet} from '@angular/common';
import { UserService } from 'app/core/user/user.service';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    HostListener,
    NgZone,
    OnDestroy,
    OnInit,
    ViewChild,
    ViewEncapsulation,
} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatMenuModule} from '@angular/material/menu';
import {MatSidenavModule} from '@angular/material/sidenav';
import {ActivatedRoute, Router, RouterLink, RouterModule} from '@angular/router';
import {FuseMediaWatcherService} from '@fuse/services/media-watcher';
import {ChatService} from 'app/modules/admin/apps/chat/chat.service';
import {Chat, ChatMessage} from 'app/modules/admin/apps/chat/chat.types';
import {ChatInfoComponent} from 'app/modules/admin/apps/chat/chat-info/chat-info.component';
import {LLM, LlmService} from "app/modules/agents/services/llm.service";
import {BehaviorSubject, Subject, takeUntil} from 'rxjs';
import {
    CLIPBOARD_OPTIONS,
    ClipboardButtonComponent,
    MarkdownModule,
    MarkdownService,
    provideMarkdown
} from "ngx-markdown";
import {MatOption} from "@angular/material/core";
import {MatSelect} from "@angular/material/select";
import {ReactiveFormsModule} from "@angular/forms";
import {MatTooltipModule} from "@angular/material/tooltip";

@Component({
    selector: 'chat-conversation',
    templateUrl: './conversation.component.html',
    styleUrls: ['./conversation.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
  imports: [
    MatSidenavModule,
    ChatInfoComponent,
    MatButtonModule,
    RouterLink,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    NgClass,
    NgTemplateOutlet,
    MatFormFieldModule,
    MatInputModule,
    TextFieldModule,
    DatePipe,
    MarkdownModule,
    AsyncPipe,
    RouterModule,
    MatOption,
    MatSelect,
    ReactiveFormsModule,
  ],
    providers: [
        provideMarkdown({
            clipboardOptions: {
                provide: CLIPBOARD_OPTIONS,
                useValue: {
                    buttonComponent: ClipboardButtonComponent,
                },
            },
        })
    ]
})
export class ConversationComponent implements OnInit, OnDestroy, AfterViewInit {

    @ViewChild('messageInput') messageInput: ElementRef;
    @ViewChild('llmSelect') llmSelect: MatSelect;
    chat: Chat;
    chats: Chat[];
    drawerMode: 'over' | 'side' = 'side';
    drawerOpened: boolean = false;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    $llms: BehaviorSubject<LLM[]> = new BehaviorSubject(null);
    llmId: string;
    defaultChatLlmId: string;
    sendIcon: string = 'heroicons_outline:paper-airplane'
    sendOnEnter: boolean = true;
    private mediaRecorder: MediaRecorder;
    private audioChunks: Blob[] = [];
    recording: boolean = false;
    /** If we're waiting for a response from the LLM after sending a message */
    generating: boolean = false;
    generatingTimer = null;

    /**
     * For the Markdown component, the syntax highlighting support has the plugins defined
     * in the angular.json file. Currently just a select few languages are included.
     */
    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _chatService: ChatService,
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private _ngZone: NgZone,
        private _elementRef: ElementRef,
        private _markdown: MarkdownService,
        private llmService: LlmService,
        private router: Router,
        private route: ActivatedRoute,
        private userService: UserService
    ) {}

    // -----------------------------------------------------------------------------------------------------
    // @ Decorated methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Resize on 'input' and 'ngModelChange' events
     *
     * @private
     */
    @HostListener('input')
    @HostListener('ngModelChange')
    private _resizeMessageInput(): void {
        // This doesn't need to trigger Angular's change detection by itself
        this._ngZone.runOutsideAngular(() => {
            setTimeout(() => {
                // Set the height to 'auto' so we can correctly read the scrollHeight
                this.messageInput.nativeElement.style.height = 'auto';

                // Detect the changes so the height is applied
                this._changeDetectorRef.detectChanges();

                // Get the scrollHeight and subtract the vertical padding
                this.messageInput.nativeElement.style.height = `${this.messageInput.nativeElement.scrollHeight}px`;

                // Detect the changes one more time to apply the final height
                this._changeDetectorRef.detectChanges();
            });
        });
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        // Subscribe to route parameters
        this.route.params
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(params => {
                const chatId = params['id'];

                if (chatId === 'new' || !chatId) {
                    // If 'new' or no ID, reset the chat
                    this.resetChat();
                }
            });

        this.userService.user$.subscribe(user => {
            this.defaultChatLlmId = user.defaultChatLlmId;
            this.setLlmSelector();
        });

        // Chat observable
        this._chatService.chat$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((chat: Chat) => {
                console.log(chat)
                this.chat = clone(chat) || { id: 'new', messages: [], title: '', updatedAt: Date.now() };

                this.setLlmSelector();
                this._changeDetectorRef.markForCheck();
            });

        // Chats observable
        this._chatService.chats$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((chats: Chat[]) => {
                this.chats = chats;
            });

        // Media watcher (unchanged)
        this._fuseMediaWatcherService.onMediaChange$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(({ matchingAliases }) => {
                this.drawerMode = matchingAliases.includes('lg') ? 'side' : 'over';
                this._changeDetectorRef.markForCheck();
            });

        // Load LLMs and set default
        this.llmService.getLlms().subscribe(llms => {
          this.$llms.next(llms);
          this.setLlmSelector();
        });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    ngAfterViewInit() {
        setTimeout(() => {
            this.messageInput.nativeElement.focus();
        }, 500); // Small delay to ensure its displayed
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------


    setLlmSelector() {
        if ((!this.chat || this.chat.id === 'new') && this.defaultChatLlmId) {
            this.llmId = this.defaultChatLlmId;
        } else if (this.chat?.messages.length > 0) {
            // Set the LLM selector as the LLM used to send the last message
            const lastMessageLlmId = this.chat.messages.at(-1).llmId
            if (lastMessageLlmId) { // TODO check the llmId is in the $llm list
                this.llmId = lastMessageLlmId;
            } else {
                if (!this.llmId && this.defaultChatLlmId) {
                    this.llmId = this.defaultChatLlmId;
                }
            }
        }
        this._changeDetectorRef.markForCheck();
    }

    /**
     * Open the chat info drawer
     */
    openChatInfo(): void {
        this.drawerOpened = true;
        this._changeDetectorRef.markForCheck();
    }

    /**
     * Reset the chat
     */
    resetChat(): void {
        this._chatService.resetChat();
    }

    /**
     * Delete the current chat
     */
    deleteChat(): void {
        if (this.chat && this.chat.id) {
            this._chatService.deleteChat(this.chat.id).subscribe(() => {
                this.resetChat();
            });
        }
    }

    /**
     * Track by function for ngFor loops
     *
     * @param index
     * @param item
     */
    trackByFn(index: number, item: any): any {
        return item.id || index;
    }

    sendMessage(): void {
        const message = this.messageInput.nativeElement.value.trim();
        if (message === '') {
            return;
        }

        this.generating = true;
        this.sendIcon = 'heroicons_outline:stop-circle'

        this.chat.messages.push({
            content: message,
            isMine: true,
        })
        const generatingMessage: ChatMessage = {
            content: '',
            isMine: false,
            generating: true
        }
        this.chat.messages.push(generatingMessage)
        // Animate the typing/generating indicator
        this.generatingTimer = setInterval(() => {
            generatingMessage.content = generatingMessage.content.length === 3 ? '.' : generatingMessage.content + '.'
            this._changeDetectorRef.markForCheck();
        }, 800)
        // Clear the input
        this.messageInput.nativeElement.value = '';

        // If this is a new chat, then redirect to the created chat
        if (!this.chat.id || this.chat.id === 'new') {
            this._changeDetectorRef.markForCheck();
            // TODO handle error, set the message back to the messageInput and remove from chat.messages
            this._chatService.createChat(message, this.llmId).subscribe(async (chat: Chat) => {
                clearInterval(this.generatingTimer)
                this.generating = false;
                this.router.navigate([`/ui/apps/chat/${chat.id}`]).catch(console.error);
            });
            // TODO catch errors
            return;
        }

        this._scrollToBottom();
        this._chatService.sendMessage(this.chat.id, message, this.llmId).subscribe((chat: Chat) => {
            console.log(`message sent`)
            console.log(chat)
            this.chat = clone(chat);
            clearInterval(this.generatingTimer)
            this.generating = false;
            this.sendIcon = 'heroicons_outline:paper-airplane'
            this._resizeMessageInput();
            this._scrollToBottom();

            // Mark for check
            this._changeDetectorRef.markForCheck();
        });
        // TODO catch errors and set this.generating=false
    }

    private _scrollToBottom(): void {
        setTimeout(() => {
            const chatElement = this._elementRef.nativeElement.querySelector('.conversation-container');
            chatElement.scrollTop = chatElement.scrollHeight;
        });
    }

    handleLlmKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            this.messageInput.nativeElement.focus();
        }
    }

    @HostListener('keydown', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent): void {
        if (this.sendOnEnter && event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }

        if (event.key === 'm' && event.ctrlKey) {
            this.llmSelect.open();
            this.llmSelect.focus();
        }
    }

    toggleSendOnEnter(): void {
        this.sendOnEnter = !this.sendOnEnter;
        this._changeDetectorRef.markForCheck();
    }

    startRecording(): void {
        if (this.recording) return;

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                this.recording = true;
                this.mediaRecorder = new MediaRecorder(stream);
                this.mediaRecorder.start();
                this.audioChunks = [];

                this.mediaRecorder.addEventListener('dataavailable', event => {
                    this.audioChunks.push(event.data);
                });

                this.mediaRecorder.addEventListener('stop', () => {
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                    this.audioChunks = [];

                    // Send the audio message
                    this.sendAudioMessage(audioBlob);
                });
            })
            .catch(error => {
                console.error('Error accessing microphone', error);
                // TODO Handle permission errors or show a message to the user
            });
    }

    stopRecording(): void {
        if (!this.recording) return;

        this.recording = false;
        this.mediaRecorder.stop();

        // Stop all tracks to release the microphone
        this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }

    /**
     * Regenerates an AI message and removes all subsequent messages.
     * Uses the last user message before the selected AI message as the prompt.
     * 
     * @param messageIndex - The index of the AI message to regenerate
     * @throws Error if no user message is found before the AI message
     */
    regenerateMessage(messageIndex: number): void {
        if (!this.chat?.messages) {
            console.warn('No chat or messages found');
            return;
        }

        // Find the last user message before the AI message we want to regenerate
        let lastUserMessage: string;
        for (let i = messageIndex; i >= 0; i--) {
            if (this.chat.messages[i].isMine) {
                lastUserMessage = this.chat.messages[i].content;
                break;
            }
        }

        if (!lastUserMessage) {
            return;
        }

        // Remove all messages from the regeneration point onwards
        this.chat.messages = this.chat.messages.slice(0, messageIndex);
        
        // Call sendMessage with the last user message
        this.sendIcon = 'heroicons_outline:stop-circle';
        this.generating = true;
        this._chatService.regenerateMessage(this.chat.id, lastUserMessage, this.llmId)
            .subscribe(() => {
                this.generating = false;
                this.sendIcon = 'heroicons_outline:paper-airplane';
                this._scrollToBottom();
                this._changeDetectorRef.markForCheck();
            });
        // TODO catch errors and set this.generating=false
    }

    sendAudioMessage(audioBlob: Blob): void {
        this._chatService.sendAudioMessage(this.chat.id, this.llmId, audioBlob).subscribe(
            () => {
                // Handle successful send, update the UI if necessary
                this._changeDetectorRef.markForCheck();
            },
            error => {
                // Handle error
                console.error('Error sending audio message', error);
            }
        );
    }
}

function clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}
