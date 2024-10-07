import { NgModule } from '@angular/core';
import { Routes, RouterModule, PreloadAllModules } from '@angular/router';
import { Shell } from '@app/shell/shell.service';

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
  Shell.childRoutes([{ path: 'chat', loadChildren: () => import('./chat/chat.module').then((m) => m.ChatModule) }]),
  Shell.childRoutes([
    {
      path: 'code-reviews',
      loadChildren: () => import('./code-review/code-review.module').then((m) => m.CodeReviewModule),
    },
  ]),
  Shell.childRoutes([{ path: 'code', loadChildren: () => import('./code/code.module').then((m) => m.CodeModule) }]),
  // Fallback when no prior route is matched
  { path: '**', redirectTo: '', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule],
  providers: [],
})
export class AppRoutingModule {}
