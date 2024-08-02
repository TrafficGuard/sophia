import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-function-edit-modal',
  templateUrl: './function-edit-modal.component.html',
  styleUrls: ['./function-edit-modal.component.scss'],
})
export class FunctionEditModalComponent {
  allFunctions: string[];
  selectedFunctions: string[];
  searchTerm: string = '';

  constructor(
    private dialogRef: MatDialogRef<FunctionEditModalComponent>,
    @Inject(MAT_DIALOG_DATA) data: { functions: string[]; allFunctions: string[] }
  ) {
    // Sort all functions and selected functions alphabetically
    this.allFunctions = data.allFunctions.sort();
    this.selectedFunctions = [...data.functions].sort();
  }

  filterFunctions(): string[] {
    if (!this.searchTerm) {
      return this.allFunctions;
    }
    const searchTerms = this.searchTerm.toLowerCase().split(/\s+/);
    return this.allFunctions.filter((func) => searchTerms.every((term) => func.toLowerCase().includes(term)));
  }

  toggleFunction(func: string): void {
    const index = this.selectedFunctions.indexOf(func);
    if (index > -1) {
      this.selectedFunctions.splice(index, 1);
    } else {
      this.selectedFunctions.push(func);
      this.selectedFunctions.sort();
    }
  }

  onSave(): void {
    this.dialogRef.close(this.selectedFunctions);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
