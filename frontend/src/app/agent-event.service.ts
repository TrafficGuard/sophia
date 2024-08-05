import { Injectable, EventEmitter } from '@angular/core';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root',
})
export class AgentEventService {
  private eventSource: EventSource | null = null;
  public messageEvent: EventEmitter<any> = new EventEmitter();

  constructor() {}

  connect(agentId: string) {
    this.eventSource = new EventSource(`${environment.serverUrl}/api/agent/v1/listen/${agentId}`);

    this.eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.messageEvent.emit(data);
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE error', error);
      this.eventSource?.close();
    };
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
    }
  }
}
