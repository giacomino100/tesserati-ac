import { Routes } from '@angular/router';
import { requireState } from './core/auth.guard';
import { unsavedChangesGuard } from './listini/unsaved-changes.guard';

export const routes: Routes = [
  {
    path: 'accesso',
    canActivate: [requireState('signedOut')],
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'non-autorizzato',
    canActivate: [requireState('denied')],
    loadComponent: () => import('./pages/denied/denied').then((m) => m.Denied),
  },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [requireState('allowed')],
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'listini',
    canActivate: [requireState('allowed')],
    loadComponent: () => import('./listini/pages/list/list').then((m) => m.ListiniList),
  },
  {
    path: 'listini/nuovo',
    canActivate: [requireState('allowed')],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./listini/pages/new/new').then((m) => m.ListinoNew),
  },
  {
    path: 'listini/:anno',
    canActivate: [requireState('allowed')],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./listini/pages/detail/detail').then((m) => m.ListinoDetail),
  },
  { path: '**', redirectTo: '' },
];
