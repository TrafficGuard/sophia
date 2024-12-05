import {ChangeDetectionStrategy, Component, ViewEncapsulation, OnInit, ChangeDetectorRef} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from 'environments/environment';
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
import {AgentService} from "../services/agent.service";

@Component({
    selector: 'agent',
    templateUrl: './agent.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
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

    constructor(
        private route: ActivatedRoute,
        private snackBar: MatSnackBar,
        private _changeDetectorRef: ChangeDetectorRef,
        private agentService: AgentService
    ) {}

    ngOnInit(): void {
        this.route.paramMap.subscribe(params => {
            this.agentId = params.get('id');
            console.log(`agent.component ngOnInit ${this.agentId}`)
            this.loadAgentDetails();
        });
    }

    loadAgentDetails(): void {
        if(!this.agentId) return;

        this.agentService.getAgentDetails(this.agentId)
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
}
