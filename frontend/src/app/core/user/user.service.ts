import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { User } from 'app/core/user/user.types';
import { catchError, Observable, ReplaySubject, tap, throwError } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserService {
    private _httpClient = inject(HttpClient);
    private _user: ReplaySubject<User> = new ReplaySubject<User>(1);

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Setter & getter for user
     *
     * @param value
     */
    set user(value: User) {
        // Store the value
        this._user.next(value);
    }

    get user$(): Observable<User> {
        return this._user.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get the current signed-in user data
     */
    get(): Observable<User> {
        return this._httpClient.get<User>(`/api/profile/view`).pipe(
            tap((user) => {
                user = (user as any).data
                this._user.next(user);
            }),
            catchError(error => {
                console.error('Error loading profile', error);
                return throwError(() => new Error('Error loading profile'));
            })
        );
    }

    /**
     * Update the user
     *
     * @param user
     */
    update(user: User): Observable<User> {
        return this._httpClient.patch<User>('/api/profile/update', { user }).pipe(
            tap((response) => {
                this._user.next(response);
            })
        );
    }
}
