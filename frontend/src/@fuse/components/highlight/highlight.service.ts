import { Injectable } from '@angular/core';
import hljs from 'highlight.js';

@Injectable({ providedIn: 'root' })
export class FuseHighlightService {
    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Highlight
     */
    highlight(code: string, language: string): string {
        // Format the code
        code = this._format(code);

        // Highlight and return the code
        return hljs.highlight(code, { language }).value;
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Private methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Remove the empty lines around the code block
     * and re-align the indentation based on the first
     * non-whitespace indented character
     *
     * @param code
     * @private
     */
    private _format(code: string): string {
        let indentation = 0;

        // Split the code into lines and store the lines
        const lines = code.split('\n');

        // Trim the empty lines around the code block
        while (lines.length && lines[0].trim() === '') {
            lines.shift();
        }

        while (lines.length && lines[lines.length - 1].trim() === '') {
            lines.pop();
        }

        // Iterate through the lines
        lines
            .filter((line) => line.length)
            .forEach((line, index) => {
                // Always get the indentation of the first line so we can
                // have something to compare with
                if (index === 0) {
                    indentation = line.search(/\S|$/);
                    return;
                }

                // Look at all the remaining lines to figure out the smallest indentation.
                indentation = Math.min(line.search(/\S|$/), indentation);
            });

        // Iterate through the lines one more time, remove the extra
        // indentation, join them together and return it
        return lines.map((line) => line.substring(indentation)).join('\n');
    }
}
