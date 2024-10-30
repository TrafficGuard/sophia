import {
    HttpErrorResponse,
    HttpEvent,
    HttpHandlerFn,
    HttpRequest,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AuthService } from 'app/core/auth/auth.service';
import { AuthUtils } from 'app/core/auth/auth.utils';
import { Observable, catchError, throwError, EMPTY} from 'rxjs';
import { environment } from "../../../environments/environment";

interface AuthStrategy {
    handleAuth(request: HttpRequest<any>): HttpRequest<any>;
    handleAuthError(error: any): Observable<any>;
}

// Regular token-based auth strategy
@Injectable()
class TokenAuthStrategy implements AuthStrategy {
    constructor(private authService: AuthService) {}

    handleAuth(request: HttpRequest<any>): HttpRequest<any> {
        // If the access token didn't expire, add the Authorization header.
        // We won't add the Authorization header if the access token expired.
        // This will force the server to return a "401 Unauthorized" response
        // for the protected API routes which our response interceptor will
        // catch and delete the access token from the local storage while logging
        // the user out from the app.
        if (
            this.authService.accessToken &&
            !AuthUtils.isTokenExpired(this.authService.accessToken)
        ) {
            return request.clone({
                headers: request.headers.set(
                    'Authorization',
                    'Bearer ' + this.authService.accessToken
                ),
            });
        }
        return request;
    }

    handleAuthError(error: any): Observable<any> {
        if (error instanceof HttpErrorResponse && error.status === 401) {
            this.authService.signOut();
            location.reload();
        }
        return throwError(() => error);
    }
}

// Google IAP strategy
@Injectable()
class GoogleIAPStrategy implements AuthStrategy {
    private readonly GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

    constructor(private authService: AuthService) {}

    handleAuth(request: HttpRequest<any>): HttpRequest<any> {
        return request.clone({
            headers: request.headers.set(
                'Authorization',
                'Bearer ' + this.authService.accessToken
            ),
        });
    }

    handleAuthError(error: any): Observable<any> {
        if (error instanceof HttpErrorResponse) {
            // Check for 302 redirect to Google OAuth
            const location = error.headers.get('Location');
            if (error.status === 302 && location?.startsWith(this.GOOGLE_AUTH_URL)) {
                // Redirect to Google auth
                window.location.href = location;
                return EMPTY; // Stop the error propagation
            }
        }
        return throwError(() => error);
    }
}

@Injectable({ providedIn: 'root' })
export class AuthStrategyFactory {
    constructor(private authService: AuthService) {}

    getStrategy(): AuthStrategy {
        return environment.auth === 'google_iap'
            ? new GoogleIAPStrategy()
            : new TokenAuthStrategy(this.authService);
    }
}

/**
 * Intercept
 *
 * @param req
 * @param next
 */
export const authInterceptor = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
    const authStrategy = inject(AuthStrategyFactory).getStrategy();

    // Apply strategy-specific auth handling
    const newReq = authStrategy.handleAuth(req);

    // Response handling
    return next(newReq).pipe(
        catchError((error) => authStrategy.handleAuthError(error))
    );
};
