import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CodeService } from '@app/shared/services/code.service';

@Component({
  selector: 'app-code',
  templateUrl: './code.component.html',
  styleUrls: ['./code.component.scss']
})
export class CodeComponent implements OnInit {
  codeForm!: FormGroup;
  result: string = '';
  isLoading: boolean = false;
  repositories: string[] = [];

  constructor(private fb: FormBuilder, private codeService: CodeService) {}

  ngOnInit() {
    this.codeForm = this.fb.group({
      workingDirectory: ['', Validators.required],
      operationType: ['code', Validators.required],
      input: ['', Validators.required]
    });

    this.codeService.getRepositories().subscribe({
      next: (repos: string[]) => {
        this.repositories = repos;
        if (repos.length > 0) {
          this.codeForm.patchValue({ workingDirectory: repos[0] });
        }
      },
      error: (error: any) => {
        console.error('Error fetching repositories:', error);
        this.result = 'Error fetching repositories. Please try again later.';
      }
    });
  }

  getInputLabel(): string {
    const operationType = this.codeForm.get('operationType')?.value;
    switch (operationType) {
      case 'code':
        return 'Requirements';
      case 'query':
        return 'Query';
      case 'selectFiles':
        return 'Requirements for File Selection';
      default:
        return 'Input';
    }
  }

  onSubmit() {
    if (this.codeForm.valid) {
      this.isLoading = true;
      const { workingDirectory, operationType, input } = this.codeForm.value;

      switch (operationType) {
        case 'code':
          this.runCodeEditWorkflow(workingDirectory, input);
          break;
        case 'query':
          this.runCodebaseQuery(workingDirectory, input);
          break;
        case 'selectFiles':
          this.selectFilesToEdit(workingDirectory, input);
          break;
      }
    }
  }

  private runCodeEditWorkflow(workingDirectory: string, input: string) {
    this.codeService.runCodeEditWorkflow(workingDirectory, input).subscribe({
      next: response => {
        this.result = JSON.stringify(response, null, 2);
        this.isLoading = false;
      },
      error: error => {
        this.result = 'Error: ' + error.message;
        this.isLoading = false;
      }
    });
  }

  private runCodebaseQuery(workingDirectory: string, input: string) {
    this.codeService.runCodebaseQuery(workingDirectory, input).subscribe({
      next: response => {
        this.result = response.response;
        this.isLoading = false;
      },
      error: error => {
        this.result = 'Error: ' + error.message;
        this.isLoading = false;
      }
    });
  }

  private selectFilesToEdit(workingDirectory: string, input: string) {
    this.codeService.selectFilesToEdit(workingDirectory, input).subscribe({
      next: response => {
        this.result = JSON.stringify(response, null, 2);
        this.isLoading = false;
      },
      error: error => {
        this.result = 'Error: ' + error.message;
        this.isLoading = false;
      }
    });
  }
}
