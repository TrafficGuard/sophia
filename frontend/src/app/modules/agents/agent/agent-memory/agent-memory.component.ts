import { Component, Input } from '@angular/core';
import { AgentContext } from '../../agent.types';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { NgForOf, NgIf, KeyValuePipe } from '@angular/common';

@Component({
    selector: 'agent-memory',
    templateUrl: './agent-memory.component.html',
    standalone: true,
    imports: [
        MatCardModule,
        MatExpansionModule,
        NgForOf,
        NgIf,
        KeyValuePipe,
    ],
})
export class AgentMemoryComponent {
    @Input() agentDetails!: AgentContext | null;

    convertMemoryValue(value: any): string {
        return JSON.stringify(value, null, 2);
    }

    memoryExpanded: { [key: string]: boolean } = {};

    toggleExpansion(key: string): void {
        this.memoryExpanded[key] = !this.memoryExpanded[key];
    }
}
