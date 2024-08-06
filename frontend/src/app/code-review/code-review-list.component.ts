import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CodeReviewService } from './code-review.service';
import { CodeReviewConfig } from './code-review.model';
import { ConfirmDialogComponent } from '../shared/confirm-dialog/confirm-dialog.component';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-code-review-list',
  templateUrl: './code-review-list.component.html',
  styleUrls: ['./code-review-list.component.scss'],
})
export class CodeReviewListComponent implements OnInit {
  configs: CodeReviewConfig[] | null = null;
  isLoading = false;
  errorMessage = '';

  constructor(private codeReviewService: CodeReviewService, private router: Router, private dialog: MatDialog) {}

  ngOnInit() {
    this.loadConfigs();
  }

  loadConfigs() {
    this.isLoading = true;
    this.codeReviewService.getCodeReviewConfigs().subscribe(
      (configs) => {
        console.log(configs);
        this.configs = configs.data;
        this.isLoading = false;
      },
      (error) => {
        this.errorMessage = 'Error loading configurations';
        this.isLoading = false;
      }
    );
  }

  openEditPage(id?: string) {
    if (id) {
      this.router.navigate(['/code-reviews/edit', id]).catch(console.error);
    } else {
      this.router.navigate(['/code-reviews/new']).catch(console.error);
    }
  }

  confirmDelete(config: CodeReviewConfig) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: { title: 'Confirm Deletion', message: `Are you sure you want to delete "${config.description}"?` },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.deleteConfig(config.id);
      }
    });
  }

  private deleteConfig(id: string) {
    this.codeReviewService.deleteCodeReviewConfig(id).subscribe(
      () => this.loadConfigs(),
      (error) => {
        this.errorMessage = 'Error deleting configuration';
      }
    );
  }
}
