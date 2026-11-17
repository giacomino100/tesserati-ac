import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { AuthService, type AuthState } from './auth.service';

/** Solo percorsi interni dell'app: niente indirizzi esterni (open redirect). */
function safeReturnUrl(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

/**
 * Guardia delle rotte (contracts/app-routes.md): lascia passare solo chi è nello stato richiesto,
 * altrimenti porta alla pagina giusta. Verso le pagine protette riverifica l'autorizzazione.
 */
export const requireState = (required: AuthState | 'allowed'): CanActivateFn => async (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ready();
  if (required === 'allowed') await auth.revalidate();

  const current = auth.state();
  if (current === required) return true;

  switch (current) {
    case 'allowed':
      return router.parseUrl(safeReturnUrl(route.queryParamMap.get('returnUrl')));
    case 'denied':
      return router.parseUrl('/non-autorizzato');
    default:
      // Si ricorda la pagina richiesta solo se era una pagina protetta.
      return router.createUrlTree(['/accesso'], {
        queryParams: required === 'allowed' ? { returnUrl: state.url || '/' } : {},
      });
  }
};
