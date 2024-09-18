import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { MaterialModule } from '@app/material.module';
import { LoaderComponent } from './loader/loader.component';
import { LlmService } from '@app/shared/services/llm.service';

@NgModule({
  imports: [FlexLayoutModule, MaterialModule, TranslateModule, CommonModule, ReactiveFormsModule, FormsModule],
  declarations: [LoaderComponent],
  exports: [LoaderComponent, ReactiveFormsModule, FormsModule],
  providers: [LlmService],
})
export class SharedModule {}
