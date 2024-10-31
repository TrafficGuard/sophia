import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { AgentContext, AgentPagination, LlmCall } from '../agent.types';
import { environment } from 'environments/environment';

@Injectable({ providedIn: 'root' })
export class AgentService {
    private _agents: BehaviorSubject<AgentContext[] | null> = new BehaviorSubject(null);

    private _pagination: BehaviorSubject<AgentPagination | null> =
        new BehaviorSubject({
            length: 0,
            size: 0,
            endIndex: 0,
            page: 0,
            lastPage: 0,
            startIndex: 0
        });

    constructor(private _httpClient: HttpClient) {}

    get agents$(): Observable<AgentContext[]> {
        return this._agents.asObservable();
    }

    get pagination$(): Observable<AgentPagination> {
        return this._pagination.asObservable();
    }

    getAgents(): Observable<AgentContext[]> {
        return this._httpClient.get<AgentContext[]>(`/api/agent/v1/list`).pipe(
            tap((agents) => {
                agents = (agents as any).data;
                this._agents.next(agents);
            })
        );
    }

    getAgentDetails(agentId: string): Observable<AgentContext> {
        return this._httpClient.get<AgentContext>(`/api/agent/v1/details/${agentId}`);
    }

    getLlmCalls(agentId: string): Observable<LlmCall[]> {
        return this._httpClient.get<LlmCall[]>(`/api/llms/calls/agent/${agentId}`);
    }

    submitFeedback(agentId: string, executionId: string, feedback: string): Observable<any> {
        return this._httpClient.post(`/api/agent/v1/feedback`, { agentId, executionId, feedback });
    }

    resumeAgent(agentId: string, executionId: string, feedback: string): Observable<any> {
        return this._httpClient.post(`/api/agent/v1/resume-hil`, { agentId, executionId, feedback });
    }

    cancelAgent(agentId: string, executionId: string, reason: string): Observable<any> {
        return this._httpClient.post(`/api/agent/v1/cancel`, { agentId, executionId, reason });
    }

    updateAgentFunctions(agentId: string, functions: string[]): Observable<any> {
        return this._httpClient.post(`/api/agent/v1/update-functions`, { agentId, functions });
    }

    deleteAgents(agentIds: string[]): Observable<any> {
        return this._httpClient.post(`/api/agent/v1/delete`, { agentIds });
    }
}
