import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-resume-agent-modal',
  templateUrl: './resume-agent-modal.component.html',
  styleUrls: ['./resume-agent-modal.component.scss'],
})
export class ResumeAgentModalComponent {
  resumeForm: FormGroup;

  constructor(
    private formBuilder: FormBuilder,
    public dialogRef: MatDialogRef<ResumeAgentModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.resumeForm = this.formBuilder.group({
      resumeInstructions: [''],
    });
  }

  onSubmit(): void {
    if (this.resumeForm.valid) {
      this.dialogRef.close(this.resumeForm.value);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
