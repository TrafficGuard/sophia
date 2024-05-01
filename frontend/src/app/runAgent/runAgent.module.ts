import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FlexLayoutModule } from '@angular/flex-layout';

import { MaterialModule } from '@app/material.module';
import { RunAgentRoutingModule } from './runAgent-routing.module';
import { RunAgentComponent } from './runAgent.component';

@NgModule({
  imports: [CommonModule, TranslateModule, FlexLayoutModule, MaterialModule, RunAgentRoutingModule],
  declarations: [RunAgentComponent],
})
export class RunAgentModule {}
