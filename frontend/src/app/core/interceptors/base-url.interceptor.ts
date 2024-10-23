import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable()
export class BaseUrlInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // console.log(`BaseUrlInterceptor ${request.url}`);
    let url = request.url.startsWith('api/') && !request.url.startsWith('api/common/') && !request.url.startsWith('api/apps/') && !request.url.startsWith('api/auth/') ?
        `${environment.apiBaseUrl}${request.url.substring(4)}` :
        request.url;
    if(url.startsWith('/api/'))
      url =  `${environment.apiBaseUrl}${request.url.substring(5)}`

    const apiRequest = request.clone({ url });
    // console.log(`apiRequest ${apiRequest.url}`)
    return next.handle(apiRequest);
  }
}
