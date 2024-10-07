import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CodeReviewEditComponent } from './code-review-edit.component';
import { CodeReviewListComponent } from './code-review-list.component';
import { marker } from '@biesbjerg/ngx-translate-extract-marker';

const routes: Routes = [
  {
    path: '',
    component: CodeReviewListComponent,
    data: { title: marker('Code Reviews') },
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
