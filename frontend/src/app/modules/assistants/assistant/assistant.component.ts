import { TextFieldModule } from '@angular/cdk/text-field';
import {AsyncPipe, DatePipe, NgClass, NgTemplateOutlet} from '@angular/common';
import {
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
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { Router, RouterLink, RouterModule, ActivatedRoute } from '@angular/router';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { AssistantsService } from 'app/modules/assistants/assistants.service';
import { AssistantChat } from '../assistant.types';
import { AssistantInfoComponent } from 'app/modules/assistants/assistant-info/assistant-info.component';
import { LLM, LlmService } from "app/modules/agents/services/llm.service";
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
import {
    CLIPBOARD_OPTIONS,
    ClipboardButtonComponent,
    MarkdownModule,
    MarkdownService,
    provideMarkdown
} from "ngx-markdown";
import { MatOption } from "@angular/material/core";
import { MatSelect } from "@angular/material/select";
import { ReactiveFormsModule } from "@angular/forms";


@Component({
    selector: 'chat-conversation',
    templateUrl: './assistant.component.html',
    styleUrls: ['./assistant.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        MatSidenavModule,
        AssistantInfoComponent,
        MatButtonModule,
        RouterLink,
        MatIconModule,
        MatMenuModule,
        MatButtonModule,
        MatMenuModule,
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
export class AssistantComponent implements OnInit, OnDestroy {

    @ViewChild('messageInput') messageInput: ElementRef;
    chat: AssistantChat;
    drawerMode: 'over' | 'side' = 'side';
    drawerOpened = false;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    $llms: BehaviorSubject<LLM[]> = new BehaviorSubject(null);
    llmId: string;
    sendIcon: string = 'heroicons_outline:paper-airplane'

    /**
     * Constructor
     */
    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _assistantService: AssistantsService,
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private _ngZone: NgZone,
        private _elementRef: ElementRef,
        private _markdown: MarkdownService,
        private llmService: LlmService,
        private router: Router,
        private route: ActivatedRoute
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
                } else {
                    // Load the chat by ID
                    this._assistantService.getChatById(chatId).subscribe();
                }
            });

        // Chat observable
        this._assistantService.chat$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((chat: AssistantChat) => {
                this.chat = chat || { id: '', messages: [], title: '' };
                if(chat.messages.length > 0) {
                    const lastMessageLlmId = chat.messages.at(-1).llmId
                    if (lastMessageLlmId) {
                        this.llmId = lastMessageLlmId;
                        console.log(`last message llm ${this.llmId}`)
                    } else {
                        // TODO default to user profile default chat LLM
                    }
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Media watcher (unchanged)
        this._fuseMediaWatcherService.onMediaChange$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(({ matchingAliases }) => {
                this.drawerMode = matchingAliases.includes('lg') ? 'side' : 'over';
                this._changeDetectorRef.markForCheck();
            });

        // Load LLMs (unchanged)
        this.llmService.getLlms().subscribe(llms => this.$llms.next(llms));
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Open the contact info
     */
    openChatInfo(): void {
        // Open the drawer
        this.drawerOpened = true;

        // Mark for check
        this._changeDetectorRef.markForCheck();
    }

    /**
     * Reset the chat
     */
    resetChat(): void {
        const newChat: AssistantChat = { id: '', messages: [], title: '' };
        this.chat = newChat;
        this._assistantService.resetChat();

        // TODO set LLM field to the user profile default chat LLM

        // Close the contact info in case it's opened
        this.drawerOpened = false;

        // Clear the input field
        if (this.messageInput) {
            this.messageInput.nativeElement.value = '';
        }

        // Mark for check
        this._changeDetectorRef.markForCheck();
    }

    /**
     * Delete the current chat
     */
    deleteChat(): void {
        if (this.chat && this.chat.id) {
            this._assistantService.deleteChat(this.chat.id).subscribe(() => {
                this.resetChat();
                this.router.navigate(['/ui/chat']).catch(console.error);
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

        // If this is a new chat, then redirect to the created chat
        if (!this.chat.id) {
            this.chat.messages.push({
                value: message,
                isMine: true,
            })
            this.messageInput.nativeElement.value = '';
            this._changeDetectorRef.markForCheck();
            // TODO handle error, set the message back to the messageInput and remove from chat.messages
            this._assistantService.createChat(message, this.llmId).subscribe(async (chat: AssistantChat) => {
                this.router.navigate([`/ui/chat/${chat.id}`]).catch(console.error);
            });

            return;
        }

        this.sendIcon = 'heroicons_outline:stop-circle'
        this._assistantService.sendMessage(this.chat.id, message, this.llmId).subscribe(() => {
            this.sendIcon = 'heroicons_outline:paper-airplane'
            // Clear the input
            this.messageInput.nativeElement.value = '';
            this._resizeMessageInput();
            this._scrollToBottom();

            // Mark for check
            this._changeDetectorRef.markForCheck();
        });
    }

    private _scrollToBottom(): void {
        setTimeout(() => {
            const chatElement = this._elementRef.nativeElement.querySelector('.conversation-container');
            chatElement.scrollTop = chatElement.scrollHeight;
        });
    }
}
