import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CodeReviewEditComponent } from './code-review-edit.component';

@Component({
  selector: 'app-code-review-list',
  templateUrl: './code-review-list.component.html',
  styleUrls: ['./code-review-list.component.scss']
})
export class CodeReviewListComponent {
  constructor(private dialog: MatDialog) {}

  openEditDialog() {
    this.dialog.open(CodeReviewEditComponent, {
      width: '600px',
      // Add any additional dialog configuration
    });
  }
}
