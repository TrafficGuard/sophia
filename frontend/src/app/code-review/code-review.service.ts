import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CodeReviewConfig } from './code-review.model';

@Injectable({
  providedIn: 'root'
})
export class CodeReviewService {
  private apiUrl = '/api/code-review-configs';

  constructor(private http: HttpClient) {}

  getCodeReviewConfigs(): Observable<CodeReviewConfig[]> {
    return this.http.get<CodeReviewConfig[]>(this.apiUrl);
  }

  getCodeReviewConfig(id: string): Observable<CodeReviewConfig> {
    return this.http.get<CodeReviewConfig>(`${this.apiUrl}/${id}`);
  }

  createCodeReviewConfig(config: Omit<CodeReviewConfig, 'id'>): Observable<string> {
    return this.http.post<string>(this.apiUrl, config);
  }

  updateCodeReviewConfig(id: string, config: Partial<CodeReviewConfig>): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, config);
  }

  deleteCodeReviewConfig(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
