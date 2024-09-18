import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface LLM {
  id: string;
  name: string;
  isConfigured: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class LlmService {
  private apiUrl = `${environment.serverUrl}/api/llms`;

  constructor(private http: HttpClient) {}

  getLlms(): Observable<LLM[]> {
    return this.http.get<LLM[]>(`${this.apiUrl}/list`);
  }
}
