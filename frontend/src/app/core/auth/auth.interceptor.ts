import {
    HttpErrorResponse,
    HttpEvent,
    HttpHandlerFn,
    HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from 'app/core/auth/auth.service';
import { AuthUtils } from 'app/core/auth/auth.utils';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from "environments/environment";

export const authInterceptor = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
    const authService = inject(AuthService);

    // Clone the request object
    let newReq = req;

    if(environment.auth === 'single_user' || environment.auth === 'google_iap') {
        // IAP, doesn't modify the request headers, the token is sent as a cookie.
        newReq = req.clone();
    } else {
        // For other authentication modes, add the Authorization header if the access token is available
        if (
            authService.accessToken &&
            !AuthUtils.isTokenExpired(authService.accessToken)
        ) {
            newReq = req.clone({
                headers: req.headers.set(
                    'Authorization',
                    'Bearer ' + authService.accessToken
                ),
            });
        }
    }

    // Response
    return next(newReq).pipe(
        catchError((error) => {
            // Handle "401 Unauthorized" responses
            if (error instanceof HttpErrorResponse && error.status === 401) {
                if (environment.auth === 'google_iap') {
                    // Refresh to trigger IAP authentication
                    window.location.reload();
                    return throwError(() => new Error('Redirecting to IAP authentication'));
                } else {
                    // Sign out and reload the app for other auth modes
                    authService.signOut();
                    location.reload();
                }
            }
            return throwError(() => error);
        })
    );
};
