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

    this.codeService.getRepositories().subscribe(
      function(repos) {
        this.repositories = repos;
        if (repos.length > 0) {
          this.codeForm.patchValue({ workingDirectory: repos[0] });
        }
      }.bind(this),
      function(error) {
        console.error('Error fetching repositories:', error);
        this.result = 'Error fetching repositories. Please try again later.';
      }.bind(this)
    );
  }

  onSubmit() {
    if (this.codeForm.valid) {
      this.isLoading = true;
      const { workingDirectory, operationType, input } = this.codeForm.value;

      if (operationType === 'code') {
        this.codeService.runCodeEditWorkflow(workingDirectory, input).subscribe(
          function(response) {
            this.result = JSON.stringify(response, null, 2);
            this.isLoading = false;
          }.bind(this),
          function(error) {
            this.result = 'Error: ' + error.message;
            this.isLoading = false;
          }.bind(this)
        );
      } else {
        this.codeService.runCodebaseQuery(workingDirectory, input).subscribe(
          function(response) {
            this.result = response;
            this.isLoading = false;
          }.bind(this),
          function(error) {
            this.result = 'Error: ' + error.message;
            this.isLoading = false;
          }.bind(this)
        );
      }
    }
  }
}
