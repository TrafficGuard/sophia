import { I18nPluralPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';
import { Subject, finalize, takeUntil, takeWhile, tap, timer } from 'rxjs';

@Component({
    selector: 'auth-sign-out',
    templateUrl: './sign-out.component.html',
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [RouterLink, I18nPluralPipe],
})
export class AuthSignOutComponent implements OnInit, OnDestroy {
    countdown: number = 5;
    countdownMapping: any = {
        '=1': '# second',
        other: '# seconds',
    };
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    /**
     * Constructor
     */
    constructor(
        private _authService: AuthService,
        private _router: Router
    ) {}

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        // Sign out
        this._authService.signOut();

        // Redirect after the countdown
        timer(1000, 1000)
            .pipe(
                finalize(() => {
                    this._router.navigate(['/ui/sign-in']);
                }),
                takeWhile(() => this.countdown > 0),
                takeUntil(this._unsubscribeAll),
                tap(() => this.countdown--)
            )
            .subscribe();
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
