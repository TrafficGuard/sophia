import { Component, OnInit } from '@angular/core';
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
  tool_name: string;
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
  /** The tools/functions available to the agent */
  toolbox: string[];
  /** Memory persisted over the agent's control loop iterations */
  memory: Map<string, string>;
}
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, startWith, map } from 'rxjs/operators';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'run-agent',
  templateUrl: './runAgent.component.html',
  styleUrls: ['./runAgent.component.scss'],
})
export class RunAgentComponent implements OnInit {
  tools: string[] = [];
  runAgentForm: FormGroup;

  constructor(private http: HttpClient) {
    this.runAgentForm = new FormGroup({
      name: new FormControl('', Validators.required),
      type: new FormControl('', Validators.required),
      systemPrompt: new FormControl('', Validators.required),
      budget: new FormControl(0, [Validators.required, Validators.min(0)]),
      count: new FormControl(0, [Validators.required, Validators.min(0), Validators.pattern('^[0-9]*$')]),
    });
  }

  ngOnInit(): void {
    this.http
      .get<{ data: string[] }>('http://localhost:3000/agent/v1/tools')
      .pipe(
        map((response) => {
          console.log(response);
          return (response.data as string[]).filter((name) => name !== 'Agent');
        })
      )
      .subscribe((tools) => {
        this.tools = tools;
        // Dynamically add form controls for each tool
        tools.forEach((tool, index) => {
          (this.runAgentForm as FormGroup).addControl('tool' + index, new FormControl(false));
        });
      });
  }

  // ... rest of the component
  onSubmit(): void {
    if (!this.runAgentForm.valid) return;
    // Implement the logic to handle form submission
    console.log('Form submitted', this.runAgentForm.value);
    const selectedTools: string[] = this.tools
      .filter((_, index) => this.runAgentForm.value['tool' + index])
      .map((tool, _) => tool);
    this.http.post('http://localhost:3000/agent/v1/run', {
      name: this.runAgentForm.value.name,
      type: this.runAgentForm.value.type,
      systemPrompt: this.runAgentForm.value.systemPrompt,
      tools: selectedTools,
      budget: this.runAgentForm.value.budget,
      count: this.runAgentForm.value.count,
    });
  }
}
