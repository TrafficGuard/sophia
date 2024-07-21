import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';


import { CodeReviewEditComponent } from './code-review-edit.component';
import { CodeReviewListComponent } from './code-review-list.component';

const routes: Routes = [
  // Module is lazy loaded, see app-routing.module.ts
  {
    //path: ':agentId', component: AgentComponent, data: { title: marker('Agent') }
    // TODO add code review routes
    path: '', component: CodeReviewListComponent
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [],
})
export class CodeReviewRoutingModule {}
