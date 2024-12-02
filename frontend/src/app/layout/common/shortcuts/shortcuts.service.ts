import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Shortcut } from 'app/layout/common/shortcuts/shortcuts.types';
import { map, Observable, ReplaySubject, switchMap, take, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ShortcutsService {
    private _shortcuts: ReplaySubject<Shortcut[]> = new ReplaySubject<Shortcut[]>(1);

    constructor(private _httpClient: HttpClient) {
        const shortcuts: Shortcut[] = [
            {
                id: 'agent',
                link: '/ui/agents/new',
                icon: 'heroicons_outline:squares-plus',
                description: '',
                label: 'New Agent',
                useRouter: true
            },
            {
                id: 'agent',
                link: '/ui/chat/new',
                icon: 'heroicons_outline:chat-bubble-left', // chat_add_on
                description: '',
                label: 'New Chat',
                useRouter: true
            },
            {
                id: 'code-review',
                link: '/ui/code-reviews/new',
                icon: 'heroicons_outline:code-bracket-square',
                description: '',
                label: 'New Code Review Config',
                useRouter: true
            }
        ]
        this._shortcuts.next(shortcuts)
    }

    // @ Accessors -----------------------------------------------------------

    /**
     * Getter for shortcuts
     */
    get shortcuts$(): Observable<Shortcut[]> {
        return this._shortcuts.asObservable();
    }

    // @ Public methods -------------------------------------------------------

    /**
     * Get all messages
     */
    getAll(): Observable<Shortcut[]> {
        return this._httpClient.get<Shortcut[]>('api/common/shortcuts').pipe(
            tap((shortcuts) => {
                this._shortcuts.next(shortcuts);
            })
        );
    }

    /**
     * Create a shortcut
     *
     * @param shortcut
     */
    create(shortcut: Shortcut): Observable<Shortcut> {
        return this.shortcuts$.pipe(
            take(1),
            switchMap((shortcuts) =>
                this._httpClient
                    .post<Shortcut>('api/common/shortcuts', { shortcut })
                    .pipe(
                        map((newShortcut) => {
                            // Update the shortcuts with the new shortcut
                            this._shortcuts.next([...shortcuts, newShortcut]);

                            // Return the new shortcut from observable
                            return newShortcut;
                        })
                    )
            )
        );
    }

    /**
     * Update the shortcut
     *
     * @param id
     * @param shortcut
     */
    update(id: string, shortcut: Shortcut): Observable<Shortcut> {
        return this.shortcuts$.pipe(
            take(1),
            switchMap((shortcuts) =>
                this._httpClient
                    .patch<Shortcut>('api/common/shortcuts', {
                        id,
                        shortcut,
                    })
                    .pipe(
                        map((updatedShortcut: Shortcut) => {
                            // Find the index of the updated shortcut
                            const index = shortcuts.findIndex(
                                (item) => item.id === id
                            );

                            // Update the shortcut
                            shortcuts[index] = updatedShortcut;

                            // Update the shortcuts
                            this._shortcuts.next(shortcuts);

                            // Return the updated shortcut
                            return updatedShortcut;
                        })
                    )
            )
        );
    }

    /**
     * Delete the shortcut
     *
     * @param id
     */
    delete(id: string): Observable<boolean> {
        return this.shortcuts$.pipe(
            take(1),
            switchMap((shortcuts) =>
                this._httpClient
                    .delete<boolean>('api/common/shortcuts', { params: { id } })
                    .pipe(
                        map((isDeleted: boolean) => {
                            // Find the index of the deleted shortcut
                            const index = shortcuts.findIndex(
                                (item) => item.id === id
                            );

                            // Delete the shortcut
                            shortcuts.splice(index, 1);

                            // Update the shortcuts
                            this._shortcuts.next(shortcuts);

                            // Return the deleted status
                            return isDeleted;
                        })
                    )
            )
        );
    }
}
