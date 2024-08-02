import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { MaterialModule } from '@app/material.module';
import { AgentRoutingModule } from './agent-routing.module';
import { AgentComponent } from './agent.component';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDialogModule } from '@angular/material/dialog';
import { FunctionEditModalComponent } from './function-edit-modal/function-edit-modal.component';
import { ResumeAgentModalComponent } from './resume-agent-modal/resume-agent-modal.component';

@NgModule({
  imports: [
    CommonModule,
    TranslateModule,
    FlexLayoutModule,
    MaterialModule,
    AgentRoutingModule,
    MatIconModule,
    MatListModule,
    MatDialogModule,
    ReactiveFormsModule,
    FormsModule,
  ],
  declarations: [AgentComponent, FunctionEditModalComponent, ResumeAgentModalComponent],
})
export class AgentModule {}
