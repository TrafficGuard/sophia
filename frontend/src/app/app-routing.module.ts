import { NgModule } from '@angular/core';
import { Routes, RouterModule, PreloadAllModules } from '@angular/router';
import { Shell } from '@app/shell/shell.service';
import { CodeReviewListComponent } from './code-review/code-review-list.component';

const routes: Routes = [
  Shell.childRoutes([{ path: 'about', loadChildren: () => import('./about/about.module').then((m) => m.AboutModule) }]),
  Shell.childRoutes([
    { path: 'agents', loadChildren: () => import('./agents/agents.module').then((m) => m.AgentsModule) },
  ]),
  Shell.childRoutes([{ path: 'agent', loadChildren: () => import('./agent/agent.module').then((m) => m.AgentModule) }]),
  Shell.childRoutes([
    { path: 'runAgent', loadChildren: () => import('./runAgent/runAgent.module').then((m) => m.RunAgentModule) },
  ]),
  Shell.childRoutes([
    { path: 'profile', loadChildren: () => import('./profile/profile.module').then((m) => m.ProfileModule) },
  ]),
  Shell.childRoutes([
    { path: 'code-reviews', component: CodeReviewListComponent },
  ]),
  // Fallback when no prior route is matched
  { path: '**', redirectTo: '', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule],
  providers: [],
})
export class AppRoutingModule {}
