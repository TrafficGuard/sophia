import { ChangeDetectionStrategy, Component, ViewEncapsulation} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {MatTooltip} from "@angular/material/tooltip";

@Component({
    selector: 'markdown-clipboard',
    template: `<button mat-icon-button
                       [matTooltip]="'Copy to clipboard'"
                       class="mat-primary copy-to-clipboard"
                       aria-label="Copy to clipboard">
        <mat-icon [svgIcon]="'content_paste'" class="icon-size-4"></mat-icon>
    </button>`,
    styles: `button.copy-to-clipboard {
      position: absolute;
      top: -0.6em;
      right: -0.5em;
      z-index: 1;
      opacity: 40%;
    }
    button.copy-to-clipboard:hover {
      opacity: 100%;
    }`,
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        MatIconModule,
        MatButtonModule,
        MatTooltip
    ],
})
export class ClipboardButtonComponent {}