import { Component, OnInit } from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import { MatSnackBar } from '@angular/material/snack-bar';
export type TaskLevel = 'easy' | 'medium' | 'hard' | 'xhard';

interface LLM {
  /**
   * The LLM model identifier
   */
  getModel(): string;

  getService(): string;
}

/**
 * The LLMs for each Task Level
 */
export type AgentLLMs = Record<TaskLevel, LLM>;

export interface Invoke {
  function_name: string;
  parameters: { [key: string]: any };
}

export interface Invoked extends Invoke {
  stdout?: string;
  stderr?: string;
}
/**
 * agent - waiting for the agent control loop to plan
 * functions - waiting for the function calls to complete
 * error - the agent control loop has errored
 * hil - the agent is waiting human confirmation to continue
 * feedback - the agent is waiting human feedback for a decision
 * completed - the agent has completed
 */
export type AgentRunningState = 'agent' | 'functions' | 'error' | 'hil' | 'feedback' | 'completed';

export interface AgentContext {
  /** Agent instance id - allocated when the agent is first starts */
  agentId: string;
  /** Id of the running execution. This changes after the control loop restarts after an exit due to pausing, human in loop etc */
  executionId: string;
  name: string;
  parentAgentId?: string;
  isRetry: boolean;
  /** Empty string in single-user mode */
  userId: string;
  userEmail?: string;

  state: AgentRunningState;
  inputPrompt: string;
  systemPrompt: string;
  functionCallHistory: Invoked[];

  // These three fields are mutable for when saving state as the agent does work
  error?: string;
  planningResponse?: string;
  invoking: Invoke[];
  /** Total cost of running this agent */
  cost: number;
  /** Budget allocated until human intervention is required. This may be increased when the agent is running */
  budget: number;
  /** Budget remaining until human intervention is required */
  budgetRemaining: number;

  llms: AgentLLMs;

  /** Working filesystem */
  fileSystem?: FileSystem | null;
  /** Directory for cloning repositories etc */
  tempDir: string;
  /** The functions available to the agent */
  functions: string[];
  /** Memory persisted over the agent's control loop iterations */
  memory: Map<string, string>;
}
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, startWith, map } from 'rxjs/operators';
import { MatTableDataSource } from '@angular/material/table';
import { environment } from '@env/environment';

@Component({
  selector: 'app-contexts',
  templateUrl: './agents.component.html',
  styleUrls: ['./agents.component.scss'],
})
export class AgentsComponent implements OnInit {
  agentContexts$: MatTableDataSource<AgentContext> = new MatTableDataSource<AgentContext>([]);
  selection = new SelectionModel<AgentContext>(true, []);

  displayedColumns: string[] = [
    'select',
    'name',
    'state',
    'userPrompt',
    //'systemPrompt',
    'error',
    'planningResponse',
    'cost',
    'budget',
    'budgetRemaining',
    'tempDir',
  ];

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadAgentContexts();
  }

  loadAgentContexts(): void {
    this.http
      .get<{ data: AgentContext[] }>(`${environment.serverUrl}/agent/v1/list`)
      .pipe(
        filter((contexts) => contexts !== null),
        map((contexts) => contexts.data)
      )
      .subscribe((contexts) => {
        this.agentContexts$.data = contexts;
        this.selection.clear();
      });
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.agentContexts$.data.length;
    return numSelected === numRows;
  }

  masterToggle() {
    this.isAllSelected() ?
      this.selection.clear() :
      this.agentContexts$.data.forEach(row => this.selection.select(row));
  }

  deleteSelectedAgents() {
    const selectedAgentIds = this.selection.selected.map(agent => agent.agentId);
    if (selectedAgentIds.length === 0) {
      this.snackBar.open('No agents selected for deletion', 'Close', { duration: 3000 });
      return;
    }

    this.http.post(`${environment.serverUrl}/agent/v1/delete`, { agentIds: selectedAgentIds })
      .subscribe({
        next: () => {
          this.snackBar.open('Agents deleted successfully', 'Close', { duration: 3000 });
          this.loadAgentContexts();
        },
        error: (error) => {
          console.error('Error deleting agents:', error);
          this.snackBar.open('Error deleting agents', 'Close', { duration: 3000 });
        }
      });
  }
}
