import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CodeReviewService } from './code-review.service';

@Component({
  selector: 'app-code-review-edit',
  templateUrl: './code-review-edit.component.html',
  styleUrls: ['./code-review-edit.component.scss'],
})
export class CodeReviewEditComponent implements OnInit {
  editForm: FormGroup | undefined;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private codeReviewService: CodeReviewService,
    public dialogRef: MatDialogRef<CodeReviewEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: string }
  ) {}

  ngOnInit() {
    this.initForm();
    if (this.data.id) {
      this.loadConfigData();
    }
  }

  initForm() {
    this.editForm = this.fb.group({
      description: ['', Validators.required],
      file_extensions: this.fb.group({
        include: [[], Validators.required],
      }),
      requires: this.fb.group({
        text: [[], Validators.required],
      }),
      examples: this.fb.array([]),
    });
  }

  loadConfigData() {
    this.isLoading = true;
    this.codeReviewService.getCodeReviewConfig(this.data.id!).subscribe(
      (config) => {
        this.editForm!.patchValue(config);
        this.isLoading = false;
      },
      (error) => {
        this.errorMessage = 'Error loading config data';
        this.isLoading = false;
      }
    );
  }

  onSubmit() {
    if (this.editForm!.valid) {
      this.isLoading = true;
      const formData = this.editForm!.value;
      if (this.data.id) {
        this.codeReviewService.updateCodeReviewConfig(this.data.id, formData).subscribe(
          () => this.dialogRef.close(true),
          (error) => {
            this.errorMessage = 'Error updating config';
            this.isLoading = false;
          }
        );
      } else {
        this.codeReviewService.createCodeReviewConfig(formData).subscribe(
          () => this.dialogRef.close(true),
          (error) => {
            this.errorMessage = 'Error creating config';
            this.isLoading = false;
          }
        );
      }
    }
  }

  get examples() {
    return this.editForm!.get('examples') as FormArray;
  }

  addExample() {
    this.examples.push(
      this.fb.group({
        code: ['', Validators.required],
        review_comment: ['', Validators.required],
      })
    );
  }

  removeExample(index: number) {
    this.examples.removeAt(index);
  }
}
