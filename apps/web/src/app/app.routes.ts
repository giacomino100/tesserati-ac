import { Routes } from '@angular/router';
import { requireState } from './core/auth.guard';

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
  { path: '**', redirectTo: '' },
];
