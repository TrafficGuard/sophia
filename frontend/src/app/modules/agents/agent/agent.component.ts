import {ChangeDetectionStrategy, Component, ViewEncapsulation, OnInit, ChangeDetectorRef} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from 'environments/environment';
import { FunctionEditModalComponent } from './function-edit-modal/function-edit-modal.component';
import { ResumeAgentModalComponent } from './resume-agent-modal/resume-agent-modal.component';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { AgentContext } from '../agent.types';
import { MatDialogModule } from '@angular/material/dialog';
import { AgentDetailsComponent } from './agent-details/agent-details.component';
import { AgentMemoryComponent } from './agent-memory/agent-memory.component';
import { AgentFunctionCallsComponent } from './agent-function-calls/agent-function-calls.component';
import { AgentLlmCallsComponent } from './agent-llm-calls/agent-llm-calls.component';

@Component({
    selector: 'agent',
    templateUrl: './agent.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        RouterOutlet,
        MatTabsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatExpansionModule,
        MatListModule,
        MatIconModule,
        FormsModule,
        ReactiveFormsModule,
        CommonModule,
        MatCheckboxModule,
        MatSelectModule,
        MatDialogModule,
        AgentDetailsComponent,
        AgentMemoryComponent,
        AgentFunctionCallsComponent,
        AgentLlmCallsComponent,
    ],
})
export class AgentComponent implements OnInit {
    agentId: string | null = null;
    agentDetails: AgentContext | null = null;
    feedbackForm: FormGroup;
    hilForm: FormGroup;
    errorForm: FormGroup;
    isSubmitting = false;
    isResumingError = false;

    constructor(
        private route: ActivatedRoute,
        private http: HttpClient,
        private formBuilder: FormBuilder,
        private snackBar: MatSnackBar,
        private router: Router,
        private dialog: MatDialog,
        private _changeDetectorRef: ChangeDetectorRef,
    ) {
        this.feedbackForm = this.formBuilder.group({
            feedback: [''],
        });
        this.hilForm = this.formBuilder.group({
            feedback: [''],
        });
        this.errorForm = this.formBuilder.group({
            errorDetails: [''],
        });
    }

    ngOnInit(): void {
        this.route.paramMap.subscribe(params => {
            this.agentId = params.get('id');
            console.log(`agent.component ngOnInig ${this.agentId}`)
            if (this.agentId) {
                this.loadAgentDetails(this.agentId);
            }
        });
    }

    loadAgentDetails(agentId: string): void {
        this.http.get<AgentContext>(`${environment.apiBaseUrl}agent/v1/details/${agentId}`)
            .subscribe(
                details => {
                    this.agentDetails = (details as any).data;

                    this.agentDetails.output = null;
                    if (this.agentDetails && this.agentDetails.state === 'completed') {
                        // If the agent has been cancelled after an error then display the error
                        // Otherwise display the Agent_completed argument
                        const maybeCompletedFunctionCall = this.agentDetails.functionCallHistory.length
                            ? this.agentDetails.functionCallHistory.slice(-1)[0]
                            : null;
                        if (maybeCompletedFunctionCall && maybeCompletedFunctionCall.parameters['note'])
                            this.agentDetails.output = this.agentDetails.error ?? maybeCompletedFunctionCall?.parameters['note'] ?? '';
                    }

                    console.log('Agent Details Loaded:', this.agentDetails);
                    this._changeDetectorRef.markForCheck();
                },
                error => {
                    console.error('Error loading agent details', error);
                    this.snackBar.open('Error loading agent details', 'Close', { duration: 3000 });
                }
            );
    }

    // Add other methods as needed (e.g., onSubmitFeedback, onResumeHil, cancelAgent, etc.)
}
