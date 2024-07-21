import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FlexLayoutModule } from '@angular/flex-layout';

import { MaterialModule } from '@app/material.module';
import {CodeReviewRoutingModule} from "@app/code-review/code-review-routing.module";
import {CodeReviewListComponent} from "@app/code-review/code-review-list.component";
import {CodeReviewEditComponent} from "@app/code-review/code-review-edit.component";
import {MatDialogModule} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";
import {MatFormFieldModule} from "@angular/material/form-field";

@NgModule({
  imports: [CommonModule, TranslateModule, FlexLayoutModule, MaterialModule, CodeReviewRoutingModule, MatDialogModule, MatIconModule, MatFormFieldModule],
  declarations: [CodeReviewListComponent, CodeReviewEditComponent],
})
export class CodeReviewModule {}
