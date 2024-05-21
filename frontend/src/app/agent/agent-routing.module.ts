import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { marker } from '@biesbjerg/ngx-translate-extract-marker';

import { AgentComponent } from './agent.component';

const routes: Routes = [
  // Module is lazy loaded, see app-routing.module.ts
  { path: ':agentId', component: AgentComponent, data: { title: marker('Agent') } },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [],
})
export class AgentRoutingModule {}

