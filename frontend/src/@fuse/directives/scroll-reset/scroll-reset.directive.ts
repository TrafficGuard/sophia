import {
    Directive,
    ElementRef,
    inject,
    OnDestroy,
    OnInit,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subject, takeUntil } from 'rxjs';

@Directive({
    selector: '[fuseScrollReset]',
    exportAs: 'fuseScrollReset',
    standalone: true,
})
export class FuseScrollResetDirective implements OnInit, OnDestroy {
    private _elementRef = inject(ElementRef);
    private _router = inject(Router);

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        // Subscribe to NavigationEnd event
        this._router.events
            .pipe(
                filter((event) => event instanceof NavigationEnd),
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(() => {
                // Reset the element's scroll position to the top
                this._elementRef.nativeElement.scrollTop = 0;
            });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }
}
