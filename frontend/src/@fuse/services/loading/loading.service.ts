import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FuseLoadingService {
    private _auto$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(
        true
    );
    private _mode$: BehaviorSubject<'determinate' | 'indeterminate'> =
        new BehaviorSubject<'determinate' | 'indeterminate'>('indeterminate');
    private _progress$: BehaviorSubject<number | null> = new BehaviorSubject<
        number | null
    >(0);
    private _show$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(
        false
    );
    private _urlMap: Map<string, boolean> = new Map<string, boolean>();

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Getter for auto mode
     */
    get auto$(): Observable<boolean> {
        return this._auto$.asObservable();
    }

    /**
     * Getter for mode
     */
    get mode$(): Observable<'determinate' | 'indeterminate'> {
        return this._mode$.asObservable();
    }

    /**
     * Getter for progress
     */
    get progress$(): Observable<number> {
        return this._progress$.asObservable();
    }

    /**
     * Getter for show
     */
    get show$(): Observable<boolean> {
        return this._show$.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Show the loading bar
     */
    show(): void {
        this._show$.next(true);
    }

    /**
     * Hide the loading bar
     */
    hide(): void {
        this._show$.next(false);
    }

    /**
     * Set the auto mode
     *
     * @param value
     */
    setAutoMode(value: boolean): void {
        this._auto$.next(value);
    }

    /**
     * Set the mode
     *
     * @param value
     */
    setMode(value: 'determinate' | 'indeterminate'): void {
        this._mode$.next(value);
    }

    /**
     * Set the progress of the bar manually
     *
     * @param value
     */
    setProgress(value: number): void {
        if (value < 0 || value > 100) {
            console.error('Progress value must be between 0 and 100!');
            return;
        }

        this._progress$.next(value);
    }

    /**
     * Sets the loading status on the given url
     *
     * @param status
     * @param url
     */
    _setLoadingStatus(status: boolean, url: string): void {
        // Return if the url was not provided
        if (!url) {
            console.error('The request URL must be provided!');
            return;
        }

        if (status === true) {
            this._urlMap.set(url, status);
            this._show$.next(true);
        } else if (status === false && this._urlMap.has(url)) {
            this._urlMap.delete(url);
        }

        // Only set the status to 'false' if all outgoing requests are completed
        if (this._urlMap.size === 0) {
            this._show$.next(false);
        }
    }
}
