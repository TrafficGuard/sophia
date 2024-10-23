import {
    ChangeDetectionStrategy,
    Component,
    Input,
    ViewEncapsulation,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDrawer } from '@angular/material/sidenav';
import { AssistantChat } from 'app/modules/assistants/assistant.types';

@Component({
    selector: 'chat-info',
    templateUrl: './assistant-info.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [MatButtonModule, MatIconModule],
})
export class AssistantInfoComponent {
    @Input() chat: AssistantChat;
    @Input() drawer: MatDrawer;

    /**
     * Constructor
     */
    constructor() {}
}
