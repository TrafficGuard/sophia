import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CodeService } from '@app/shared/services/code.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-code',
  templateUrl: './code.component.html',
  styleUrls: ['./code.component.scss'],
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
      input: ['', Validators.required],
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
      },
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
    console.log(`valid ${this.codeForm.valid}`);
    if (this.codeForm.valid) {
      this.isLoading = true;
      this.executeOperation();
    }
  }

  /**
   * Executes the selected operation based on the form input.
   * This method handles different operation types and calls the appropriate service method.
   * It also manages the loading state and error handling for all operations.
   */
  private executeOperation() {
    const { workingDirectory, operationType, input } = this.codeForm.value;

    let operation: Observable<any>;

    switch (operationType) {
      case 'code':
        operation = this.codeService.runCodeEditWorkflow(workingDirectory, input);
        break;
      case 'query':
        operation = this.codeService.runCodebaseQuery(workingDirectory, input);
        break;
      case 'selectFiles':
        operation = this.codeService.selectFilesToEdit(workingDirectory, input);
        break;
      default:
        this.result = 'Error: Invalid operation type';
        this.isLoading = false;
        return;
    }

    operation.subscribe({
      next: (response: any) => {
        this.result = operationType === 'query' ? response.response : JSON.stringify(response, null, 2);
        this.isLoading = false;
      },
      error: (error: Error) => {
        console.error(`Error in ${operationType} operation:`, error);
        this.result = `Error during ${operationType} operation: ${error.message}`;
        this.isLoading = false;
      },
    });
  }
}
