import { HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

export type FuseMockApiReplyCallback =
    | ((data: {
          request: HttpRequest<any>;
          urlParams: { [key: string]: string };
      }) => [number, string | any] | Observable<any>)
    | undefined;

export type FuseMockApiMethods =
    | 'get'
    | 'post'
    | 'patch'
    | 'delete'
    | 'put'
    | 'head'
    | 'jsonp'
    | 'options';
