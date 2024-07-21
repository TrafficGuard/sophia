import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CodeReviewEditComponent } from './code-review-edit.component';
import { CodeReviewService } from './code-review.service';
import { CodeReviewConfig } from './code-review.model';

@Component({
  selector: 'app-code-review-list',
  templateUrl: './code-review-list.component.html',
  styleUrls: ['./code-review-list.component.scss']
})
export class CodeReviewListComponent implements OnInit {
  configs: CodeReviewConfig[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(private dialog: MatDialog, private codeReviewService: CodeReviewService) {}

  ngOnInit() {
    this.loadConfigs();
  }

  loadConfigs() {
    this.isLoading = true;
    this.codeReviewService.getCodeReviewConfigs().subscribe(
      (configs) => {
        this.configs = configs;
        this.isLoading = false;
      },
      (error) => {
        this.errorMessage = 'Error loading configurations';
        this.isLoading = false;
      }
    );
  }

  openEditDialog(id?: string) {
    const dialogRef = this.dialog.open(CodeReviewEditComponent, {
      width: '600px',
      data: { id }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadConfigs();
      }
    });
  }

  deleteConfig(id: string) {
    if (confirm('Are you sure you want to delete this configuration?')) {
      this.codeReviewService.deleteCodeReviewConfig(id).subscribe(
        () => this.loadConfigs(),
        (error) => {
          this.errorMessage = 'Error deleting configuration';
        }
      );
    }
  }
}
