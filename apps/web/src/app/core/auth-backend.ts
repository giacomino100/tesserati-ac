import { InjectionToken } from '@angular/core';

/** Dati della sessione letti dall'account Google; non vengono mai salvati (FR-012). */
export interface SessionUser {
  readonly displayName: string | null;
  readonly email: string;
  readonly emailVerified: boolean;
  /** Istante dell'ultimo accesso effettivo con Google (non cambia al rinnovo del token). */
  readonly lastSignInTime: string | undefined;
}

/** Confine verso Firebase: permette di provare `AuthService` con un backend finto. */
export interface AuthBackend {
  /** Notifica l'utente corrente (o null) ora e a ogni cambio; restituisce la funzione per smettere. */
  onAuthChanged(callback: (user: SessionUser | null) => void): () => void;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
  /** Cancella l'account Firebase dell'utente corrente (nessuna traccia, ricerca R4). */
  deleteCurrentUser(): Promise<void>;
  /** True se `allowedEmails/<email in minuscolo>` esiste. Può fallire con `permission-denied`. */
  isEmailAllowed(email: string): Promise<boolean>;
}

export const AUTH_BACKEND = new InjectionToken<AuthBackend>('AUTH_BACKEND');
