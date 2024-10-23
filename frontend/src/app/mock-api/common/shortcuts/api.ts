import { Injectable } from '@angular/core';
import { FuseMockApiService, FuseMockApiUtils } from '@fuse/lib/mock-api';
import { shortcuts as shortcutsData } from 'app/mock-api/common/shortcuts/data';
import { assign, cloneDeep } from 'lodash-es';

@Injectable({ providedIn: 'root' })
export class ShortcutsMockApi {
    private _shortcuts: any = shortcutsData;

    /**
     * Constructor
     */
    constructor(private _fuseMockApiService: FuseMockApiService) {
        // Register Mock API handlers
        this.registerHandlers();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Register Mock API handlers
     */
    registerHandlers(): void {
        // -----------------------------------------------------------------------------------------------------
        // @ Shortcuts - GET
        // -----------------------------------------------------------------------------------------------------
        this._fuseMockApiService
            .onGet('api/common/shortcuts')
            .reply(() => [200, cloneDeep(this._shortcuts)]);

        // -----------------------------------------------------------------------------------------------------
        // @ Shortcuts - POST
        // -----------------------------------------------------------------------------------------------------
        this._fuseMockApiService
            .onPost('api/common/shortcuts')
            .reply(({ request }) => {
                // Get the shortcut
                const newShortcut = cloneDeep(request.body.shortcut);

                // Generate a new GUID
                newShortcut.id = FuseMockApiUtils.guid();

                // Unshift the new shortcut
                this._shortcuts.unshift(newShortcut);

                // Return the response
                return [200, newShortcut];
            });

        // -----------------------------------------------------------------------------------------------------
        // @ Shortcuts - PATCH
        // -----------------------------------------------------------------------------------------------------
        this._fuseMockApiService
            .onPatch('api/common/shortcuts')
            .reply(({ request }) => {
                // Get the id and shortcut
                const id = request.body.id;
                const shortcut = cloneDeep(request.body.shortcut);

                // Prepare the updated shortcut
                let updatedShortcut = null;

                // Find the shortcut and update it
                this._shortcuts.forEach(
                    (item: any, index: number, shortcuts: any[]) => {
                        if (item.id === id) {
                            // Update the shortcut
                            shortcuts[index] = assign(
                                {},
                                shortcuts[index],
                                shortcut
                            );

                            // Store the updated shortcut
                            updatedShortcut = shortcuts[index];
                        }
                    }
                );

                // Return the response
                return [200, updatedShortcut];
            });

        // -----------------------------------------------------------------------------------------------------
        // @ Shortcuts - DELETE
        // -----------------------------------------------------------------------------------------------------
        this._fuseMockApiService
            .onDelete('api/common/shortcuts')
            .reply(({ request }) => {
                // Get the id
                const id = request.params.get('id');

                // Prepare the deleted shortcut
                let deletedShortcut = null;

                // Find the shortcut
                const index = this._shortcuts.findIndex(
                    (item: any) => item.id === id
                );

                // Store the deleted shortcut
                deletedShortcut = cloneDeep(this._shortcuts[index]);

                // Delete the shortcut
                this._shortcuts.splice(index, 1);

                // Return the response
                return [200, deletedShortcut];
            });
    }
}
