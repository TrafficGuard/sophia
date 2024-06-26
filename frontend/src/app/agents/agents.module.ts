import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FlexLayoutModule } from '@angular/flex-layout';

import { MaterialModule } from '@app/material.module';
import { AgentsRoutingModule } from './agents-routing.module';
import { AgentsComponent } from './agents.component';
import { MatToolbarModule } from '@angular/material/toolbar';

@NgModule({
  imports: [
    CommonModule,
    TranslateModule,
    FlexLayoutModule,
    MaterialModule,
    AgentsRoutingModule,
    MatToolbarModule
  ],
  declarations: [AgentsComponent],
})
export class AgentsModule {}
