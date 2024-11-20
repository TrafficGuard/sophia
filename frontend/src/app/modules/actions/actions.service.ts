import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {environment} from "../../../environments/environment";



@Injectable({
  providedIn: 'root',
})
export class ActionsService {
  constructor(private http: HttpClient) {}

  runCodeEditWorkflow(workingDirectory: string, requirements: string): Observable<any> {
    return this.http.post(`/api/code/edit`, { workingDirectory, requirements });
  }

  runCodebaseQuery(workingDirectory: string, query: string): Observable<{ response: string }> {
    return this.http.post<{ response: string }>(`/api/code/query`, { workingDirectory, query });
  }

  selectFilesToEdit(workingDirectory: string, requirements: string): Observable<any> {
    return this.http.post(`/api/code/select-files`, { workingDirectory, requirements });
  }

  getRepositories(): Observable<string[]> {
    return this.http.get<string[]>(`/api/code/repositories`);
  }
}
