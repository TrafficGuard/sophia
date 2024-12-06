import { Component, Input, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LlmCall } from '../../agent.types';
import { environment } from 'environments/environment';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import {AgentService} from "../../services/agent.service";

@Component({
    selector: 'agent-llm-calls',
    templateUrl: './agent-llm-calls.component.html',
    styleUrl: 'agent-llm-calls.component.scss',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatIconModule,
        MatExpansionModule,
        MatButtonModule,
    ],
})
export class AgentLlmCallsComponent implements OnInit {
    @Input() agentId: string | null = null;
    llmCalls: LlmCall[] = [];

    constructor(
        private sanitizer: DomSanitizer,
        private snackBar: MatSnackBar,
        private agentService: AgentService,
    ) {}

    ngOnInit(): void {
        if (this.agentId) {
            this.loadLlmCalls();
        }
    }

    loadLlmCalls(): void {
        this.agentService.getLlmCalls(this.agentId)
            .subscribe(
                (calls) => {
                    this.llmCalls = calls;
                    console.log(calls);
                    this.llmCalls.forEach((call) => {
                        call.userPrompt = call.userPrompt?.replace('\\n', '<br/>');
                        if (call.systemPrompt) {
                            call.systemPrompt = call.systemPrompt.replace('\\n', '<br/>');
                        }
                        for (const msg of call.messages) {
                            if(typeof msg.content === 'string')
                                msg.content = msg.content.replace('\\n', '<br/>');
                        }
                    });
                },
                (error) => {
                    console.error('Error loading LLM calls', error);
                    this.snackBar.open('Error loading LLM calls', 'Close', {
                        duration: 3000,
                    });
                }
            );
    }

    removeFunctionCallHistory(text: string): string {
        return text.replace(/<function_call_history>.*?<\/function_call_history>/gs, '');
    }

    extractFunctionCallHistory(text: string): string | null {
        const functionCallHistoryRegex = /<function_call_history>(.*?)<\/function_call_history>/s;
        const match = functionCallHistoryRegex.exec(text);
        if (match && match[1]) {
            return match[1].trim();
        }
        return null;
    }

    extractMemoryContent(text: string): string | null {
        const memoryContentRegex = /<memory>(.*?)<\/memory>/s;
        const match: RegExpExecArray | null = memoryContentRegex.exec(text);
        if (match && match[0]) {
            return match[0].trim();
        }
        return null;
    }

    removeMemoryContent(text: string): string {
        return text?.replace(/<memory>.*?<\/memory>/gs, '') ?? '';
    }

    convertNewlinesToHtml(text: string): SafeHtml {
        text ??= '';
        return this.sanitizer.bypassSecurityTrustHtml(
            text.replaceAll('\\n', '<br/>').replaceAll('\\t', '&nbsp;&nbsp;&nbsp;&nbsp;')
        );
    }

    llmCallUrl(call: LlmCall): string {
        return `https://console.cloud.google.com/firestore/databases/${
            environment.firestoreDb || '(default)'
        }/data/panel/LlmCall/${call.id}?project=${environment.gcpProject}`;
    }

    getLlmName(llmId: string): string {
        // This method needs to be implemented or passed from the parent component
        return llmId;
    }
}
