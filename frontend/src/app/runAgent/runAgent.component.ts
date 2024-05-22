import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {map} from 'rxjs/operators';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import {MatSnackBar} from "@angular/material/snack-bar";
import {environment} from "@env/environment";


@Component({
  selector: 'run-agent',
  templateUrl: './runAgent.component.html',
  styleUrls: ['./runAgent.component.scss'],
})
export class RunAgentComponent implements OnInit {
  tools: string[] = [];
  llms: string[] = []
  runAgentForm: FormGroup;
  isSubmitting: boolean = false;

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {
    this.runAgentForm = new FormGroup({
      name: new FormControl('', Validators.required),
      userPrompt: new FormControl('', Validators.required),
      // type: new FormControl('', Validators.required),
      // systemPrompt: new FormControl('', Validators.required),
      llmEasy: new FormControl('', Validators.required),
      llmMedium: new FormControl('', Validators.required),
      llmHard: new FormControl('', Validators.required),
      budget: new FormControl(0, [Validators.required, Validators.min(0)]),
      count: new FormControl(0, [Validators.required, Validators.min(0), Validators.pattern('^[0-9]*$')]),
    });
  }
  setPreset(preset: string): boolean {
    console.log(`setPreset ${preset}`)
    const presets = {
      'claude-vertex': { easy: 'anthropic-vertex:claude-3-haiku', medium: 'anthropic-vertex:claude-3-sonnet', hard: 'anthropic-vertex:claude-3-sonnet' },
      'claude': { easy: 'anthropic-vertex:claude-3-haiku', medium: 'anthropic-vertex:claude-3-sonnet', hard: 'anthropic:claude-3-opus' },
      'gemini': { easy: 'vertex:gemini-1.5-flash', medium: 'vertex:gemini-1.5-pro', hard: 'vertex:gemini-1.5-pro' },
      'gemini-free': { easy: 'vertex:gemini-1.5-flash', medium: 'vertex:gemini-experimental', hard: 'vertex:gemini-experimental' },
      'openai': { easy: 'openai:gpt-4o', medium: 'openai:gpt-4o', hard: 'openai:gpt-4o' },
    };
    const selection = presets[preset];
    if (selection) {
      this.runAgentForm.controls['llmEasy'].setValue(selection.easy);
      this.runAgentForm.controls['llmMedium'].setValue(selection.medium);
      this.runAgentForm.controls['llmHard'].setValue(selection.hard);
    }
    return false
  }

  ngOnInit(): void {
    this.http
      .get<{ data: string[] }>(`${environment.serverUrl}/agent/v1/tools`)
      .pipe(
        map((response) => {
          console.log(response);
          return (response.data as string[]).filter((name) => name !== 'Agent');
        })
      )
      .subscribe((tools) => {
        this.tools = tools.sort();
        // Dynamically add form controls for each tool
        tools.forEach((tool, index) => {
          (this.runAgentForm as FormGroup).addControl('tool' + index, new FormControl(false));
        });
      });
    this.http
      .get<{ data: string[] }>(`${environment.serverUrl}/llms/list`)
      .pipe(
        map((response) => {
          console.log(response);
          return (response.data as string[]);
        })
      )
      .subscribe((llms) => {
        this.llms = llms;
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
    this.http.post(`${environment.serverUrl}/agent/v1/start`, {
      name: this.runAgentForm.value.name,
      userPrompt: this.runAgentForm.value.userPrompt,
      // type: this.runAgentForm.value.type,
      // systemPrompt: this.runAgentForm.value.systemPrompt,
      tools: selectedTools,
      budget: this.runAgentForm.value.budget,
      count: this.runAgentForm.value.count,
      llmEasy: this.runAgentForm.value.llmEasy,
      llmMedium: this.runAgentForm.value.llmMedium,
      llmHard: this.runAgentForm.value.llmHard,
    }).subscribe({
      next: data => {
        this.snackBar.open('Agent started', 'Close', { duration: 3000 });
      },
      error: error => {
        this.snackBar.open(`Error ${error.message}`, 'Close', { duration: 3000 });
        console.error('Error starting agent', error);
      }
    })
  }
}
