import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CodeService } from '@app/shared/services/code.service';

@Component({
  selector: 'app-code',
  templateUrl: './code.component.html',
  styleUrls: ['./code.component.scss']
})
export class CodeComponent implements OnInit {
  codeForm: FormGroup;
  result: string = '';
  isLoading: boolean = false;

  constructor(private fb: FormBuilder, private codeService: CodeService) {}

  ngOnInit() {
    this.codeForm = this.fb.group({
      workingDirectory: ['', Validators.required],
      operationType: ['code', Validators.required],
      input: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.codeForm.valid) {
      this.isLoading = true;
      const { workingDirectory, operationType, input } = this.codeForm.value;
      
      if (operationType === 'code') {
        this.codeService.runCodeEditWorkflow(workingDirectory, input).subscribe(
          response => {
            this.result = JSON.stringify(response, null, 2);
            this.isLoading = false;
          },
          error => {
            this.result = 'Error: ' + error.message;
            this.isLoading = false;
          }
        );
      } else {
        this.codeService.runCodebaseQuery(workingDirectory, input).subscribe(
          response => {
            this.result = response;
            this.isLoading = false;
          },
          error => {
            this.result = 'Error: ' + error.message;
            this.isLoading = false;
          }
        );
      }
    }
  }
}
