import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FlexLayoutModule } from '@angular/flex-layout';

import { MaterialModule } from '@app/material.module';
import { CodeReviewRoutingModule } from "@app/code-review/code-review-routing.module";
import { CodeReviewListComponent } from "@app/code-review/code-review-list.component";
import { CodeReviewEditComponent } from "@app/code-review/code-review-edit.component";
import {MatSnackBarModule} from "@angular/material/snack-bar";

@NgModule({
  imports: [CommonModule, TranslateModule, MatSnackBarModule, FlexLayoutModule, MaterialModule, CodeReviewRoutingModule],
  declarations: [CodeReviewListComponent, CodeReviewEditComponent],
})
export class CodeReviewModule {}
