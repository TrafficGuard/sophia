import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { environment } from '@env/environment';
import { AgentEventService } from '@app/agent-event.service';
import { LlmService } from '@app/shared/services/llm.service';
import { AgentType } from '@shared';

interface StartAgentResponse {
  data: {
    agentId: string;
  };
}

const defaultType: AgentType = 'codegen';

@Component({
  selector: 'app-run-agent',
  templateUrl: './runAgent.component.html',
  styleUrls: ['./runAgent.component.scss'],
})
export class RunAgentComponent implements OnInit {
  functions: string[] = [];
  llms: any[] = [];
  runAgentForm: FormGroup;
  isSubmitting: boolean = false;

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private router: Router,
    private agentEventService: AgentEventService,
    private llmService: LlmService
  ) {
    this.runAgentForm = new FormGroup({
      name: new FormControl('', Validators.required),
      userPrompt: new FormControl('', Validators.required),
      type: new FormControl(defaultType, Validators.required),
      llmEasy: new FormControl('', Validators.required),
      llmMedium: new FormControl('', Validators.required),
      llmHard: new FormControl('', Validators.required),
      budget: new FormControl(0, [Validators.required, Validators.min(0)]),
      count: new FormControl(0, [Validators.required, Validators.min(0), Validators.pattern('^[0-9]*$')]),
    });
  }
  setPreset(preset: string): boolean {
    console.log(`setPreset ${preset}`);
    const presets = {
      'claude-vertex': {
        easy: 'anthropic-vertex:claude-3-haiku',
        medium: 'anthropic-vertex:claude-3-5-sonnet',
        hard: 'anthropic-vertex:claude-3-5-sonnet',
      },
      claude: {
        easy: 'anthropic:claude-3-haiku',
        medium: 'anthropic:claude-3-5-sonnet',
        hard: 'anthropic:claude-3-5-sonnet',
      },
      gemini: { easy: 'vertex:gemini-1.5-flash', medium: 'vertex:gemini-1.5-flash', hard: 'vertex:gemini-1.5-pro' },
      openai: { easy: 'openai:gpt-4o', medium: 'openai:gpt-4o', hard: 'openai:gpt-4o' },
    };
    const selection = presets[preset];
    if (selection) {
      const ids = this.llms.map((llm) => llm.id);
      this.runAgentForm.controls['llmEasy'].setValue(ids.find((id) => id.startsWith(selection.easy)));
      this.runAgentForm.controls['llmMedium'].setValue(ids.find((id) => id.startsWith(selection.medium)));
      this.runAgentForm.controls['llmHard'].setValue(ids.find((id) => id.startsWith(selection.hard)));
    }
    return false;
  }

  ngOnInit(): void {
    this.http
      .get<{ data: string[] }>(`${environment.serverUrl}/agent/v1/functions`)
      .pipe(
        map((response) => {
          console.log(response);
          return (response.data as string[]).filter((name) => name !== 'Agent');
        })
      )
      .subscribe((functions) => {
        this.functions = functions.sort();
        // Dynamically add form controls for each function
        functions.forEach((tool, index) => {
          (this.runAgentForm as FormGroup).addControl('function' + index, new FormControl(false));
        });
      });

    this.llmService.getLlms().subscribe({
      next: (llms) => {
        this.llms = llms;
      },
      error: (error) => {
        console.error('Error fetching LLMs:', error);
        this.snackBar.open('Failed to load LLMs', 'Close', { duration: 3000 });
      },
    });

    this.loadUserProfile();
  }

  private loadUserProfile(): void {
    const profileUrl = `${environment.serverUrl}/profile/view`;
    this.http.get(profileUrl).subscribe(
      (response: any) => {
        console.log(response.data);
        this.runAgentForm.controls['budget'].setValue(response.data.hilBudget);
        this.runAgentForm.controls['count'].setValue(response.data.hilCount);
      },
      (error) => {
        console.log(error);
        this.snackBar.open('Failed to load user profile', 'Close', { duration: 3000 });
      }
    );
  }

  // ... rest of the component
  onSubmit(): void {
    if (!this.runAgentForm.valid) return;
    // Implement the logic to handle form submission
    console.log('Form submitted', this.runAgentForm.value);
    const selectedFunctions: string[] = this.functions
      .filter((_, index) => this.runAgentForm.value['function' + index])
      .map((tool, _) => tool);
    this.http
      .post<StartAgentResponse>(`${environment.serverUrl}/agent/v1/start`, {
        name: this.runAgentForm.value.name,
        userPrompt: this.runAgentForm.value.userPrompt,
        type: this.runAgentForm.value.type,
        // systemPrompt: this.runAgentForm.value.systemPrompt,
        functions: selectedFunctions,
        budget: this.runAgentForm.value.budget,
        count: this.runAgentForm.value.count,
        llmEasy: this.runAgentForm.value.llmEasy,
        llmMedium: this.runAgentForm.value.llmMedium,
        llmHard: this.runAgentForm.value.llmHard,
      })
      .subscribe({
        next: (response) => {
          this.snackBar.open('Agent started', 'Close', { duration: 3000 });
          this.router.navigate(['/agent', response.data.agentId]).catch((e) => console.error); // Assuming the response contains the agentId
        },
        error: (error) => {
          this.snackBar.open(`Error ${error.message}`, 'Close', { duration: 3000 });
          console.error('Error starting agent', error);
        },
      });
  }
}
