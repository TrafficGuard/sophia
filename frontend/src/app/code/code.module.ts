import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CodeComponent } from './code.component';
import { MaterialModule } from '@app/material.module';
import { marker } from '@biesbjerg/ngx-translate-extract-marker';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule,
    RouterModule.forChild([{ path: '', component: CodeComponent, data: { title: marker('Repository actions') } }]),
  ],
  declarations: [CodeComponent],
})
export class CodeModule {}
