import { Component, Input } from '@angular/core';
import { AgentContext } from '../../agent.types';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
    selector: 'agent-function-calls',
    template: `
        <mat-card class="p-5">
            <div class="pb-8" *ngFor="let invoked of agentDetails?.functionCallHistory?.slice().reverse(); let i = index">
                <div class="mb-3 font-medium text-xl">{{ invoked.function_name }}</div>
            
                <div *ngFor="let param of invoked.parameters | keyvalue">
                    <p><strong>{{ param.key }}:</strong> {{ param.value }}</p>
                </div>
                <mat-expansion-panel *ngIf="invoked.stdout" class="mt-4">
                    <mat-expansion-panel-header>
                        <mat-panel-title>Output</mat-panel-title>
                    </mat-expansion-panel-header>
                    <p>{{ invoked.stdout }}</p>
                </mat-expansion-panel>
                <mat-expansion-panel *ngIf="invoked.stderr" class="mt-4">
                    <mat-expansion-panel-header>
                        <mat-panel-title>Errors</mat-panel-title>
                    </mat-expansion-panel-header>
                    <p>{{ invoked.stderr }}</p>
                </mat-expansion-panel>
            </div>
        </mat-card>
    `,
    standalone: true,
    imports: [CommonModule, MatCardModule, MatExpansionModule],
})
export class AgentFunctionCallsComponent {
    @Input() agentDetails: AgentContext | null = null;
}
