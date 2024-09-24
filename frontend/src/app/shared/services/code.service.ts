import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root'
})
export class CodeService {
  constructor(private http: HttpClient) {}

  runCodeEditWorkflow(workingDirectory: string, requirements: string): Observable<any> {
    return this.http.post(`${environment.serverUrl}/code/edit`, { workingDirectory, requirements });
  }

  runCodebaseQuery(workingDirectory: string, query: string): Observable<string> {
    return this.http.post<string>(`${environment.serverUrl}/code/query`, { workingDirectory, query });
  }
}
