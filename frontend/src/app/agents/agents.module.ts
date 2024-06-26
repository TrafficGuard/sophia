import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FlexLayoutModule } from '@angular/flex-layout';

import { MaterialModule } from '@app/material.module';
import { AgentsRoutingModule } from './agents-routing.module';
import { AgentsComponent } from './agents.component';

@NgModule({
  imports: [
    CommonModule,
    TranslateModule,
    FlexLayoutModule,
    MaterialModule,
    AgentsRoutingModule
  ],
  declarations: [AgentsComponent],
})
export class AgentsModule {}
