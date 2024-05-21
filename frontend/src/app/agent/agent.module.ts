import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FlexLayoutModule } from '@angular/flex-layout';

import { MaterialModule } from '@app/material.module';
import { AgentRoutingModule } from './agent-routing.module';
import { AgentComponent } from './agent.component';

@NgModule({
  imports: [CommonModule, TranslateModule, FlexLayoutModule, MaterialModule, AgentRoutingModule],
  declarations: [AgentComponent],
})
export class AgentModule {}
