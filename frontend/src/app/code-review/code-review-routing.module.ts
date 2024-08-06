import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CodeReviewEditComponent } from './code-review-edit.component';
import { CodeReviewListComponent } from './code-review-list.component';

const routes: Routes = [
  {
    path: '',
    component: CodeReviewListComponent,
  },
  {
    path: 'new',
    component: CodeReviewEditComponent,
  },
  {
    path: 'edit/:id',
    component: CodeReviewEditComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [],
})
export class CodeReviewRoutingModule {}
