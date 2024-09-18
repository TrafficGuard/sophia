import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, shareReplay, map } from 'rxjs/operators';
import { environment } from '@env/environment';

export interface LLM {
  id: string;
  name: string;
  isConfigured: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LlmService {
  private llmsSubject = new BehaviorSubject<LLM[]>([]);
  private llmsLoaded = false;

  constructor(private http: HttpClient) {}

  getLlms(): Observable<LLM[]> {
    if (!this.llmsLoaded) {
      return this.fetchLlms().pipe(
        tap(llms => {
          this.llmsSubject.next(llms);
          this.llmsLoaded = true;
        }),
        shareReplay(1)
      );
    }
    return this.llmsSubject.asObservable();
  }

  private fetchLlms(): Observable<LLM[]> {
    return this.http.get<{ data: LLM[] }>(`${environment.serverUrl}/api/llms/list`)
      .pipe(
        map(response => response.data)
      );
  }
}
