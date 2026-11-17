import { Injectable, inject, signal } from '@angular/core';
import { AUTH_BACKEND, type SessionUser } from './auth-backend';
import { isSessionExpired } from './session';

export type AuthState = 'loading' | 'signedOut' | 'denied' | 'allowed';

export const MESSAGES = {
  cancelled: 'Accesso annullato. Riprova.',
  network: 'Impossibile connettersi. Controlla la connessione e riprova.',
  unexpected: 'Qualcosa è andato storto. Riprova tra poco.',
} as const;

const CANCELLED_CODES = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];

function errorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : undefined;
}

/**
 * Stato di accesso dell'app (data-model.md). L'autorizzazione vera sta nelle Security Rules:
 * qui si decide solo cosa mostrare. Nessun nome o email viene mai registrato nei log (FR-012).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly backend = inject(AUTH_BACKEND);

  readonly state = signal<AuthState>('loading');
  readonly user = signal<SessionUser | null>(null);
  readonly errorMessage = signal<string | null>(null);

  private resolveReady: () => void = () => undefined;
  private readonly readyPromise = new Promise<void>((resolve) => (this.resolveReady = resolve));

  constructor() {
    this.backend.onAuthChanged((user) => void this.handle(user));
  }

  /** Si risolve appena lo stato non è più `loading`. */
  ready(): Promise<void> {
    return this.readyPromise;
  }

  async signIn(): Promise<void> {
    this.errorMessage.set(null);
    try {
      await this.backend.signInWithGoogle();
    } catch (error) {
      const code = errorCode(error);
      if (code && CANCELLED_CODES.includes(code)) this.errorMessage.set(MESSAGES.cancelled);
      else if (code === 'auth/network-request-failed') this.errorMessage.set(MESSAGES.network);
      else this.errorMessage.set(MESSAGES.unexpected);
    }
  }

  async signOut(): Promise<void> {
    try {
      await this.backend.signOut();
    } catch {
      // l'uscita deve riuscire comunque lato app
    }
    this.user.set(null);
    this.errorMessage.set(null);
    this.setState('signedOut');
  }

  /** Riverifica che l'utente entrato sia ancora in elenco (FR-006); gli errori di rete non lo buttano fuori. */
  async revalidate(): Promise<void> {
    const current = this.user();
    if (this.state() !== 'allowed' || !current) return;
    if (isSessionExpired(current.lastSignInTime, new Date())) {
      await this.signOut();
      return;
    }
    await this.check(current, true);
  }

  private async handle(user: SessionUser | null): Promise<void> {
    if (!user) {
      // Dopo un rifiuto il backend esce da solo: lo stato `denied` deve restare.
      if (this.state() === 'denied') return;
      this.user.set(null);
      this.setState('signedOut');
      return;
    }
    if (isSessionExpired(user.lastSignInTime, new Date())) {
      try {
        await this.backend.signOut();
      } catch {
        // ignorato
      }
      this.user.set(null);
      this.setState('signedOut');
      return;
    }
    await this.check(user, false);
  }

  private async check(user: SessionUser, keepOnNetworkError: boolean): Promise<void> {
    let allowed = false;
    if (user.emailVerified) {
      try {
        allowed = await this.backend.isEmailAllowed(user.email);
      } catch (error) {
        if (errorCode(error) !== 'permission-denied') {
          if (keepOnNetworkError) return;
          this.errorMessage.set(MESSAGES.network);
          this.user.set(null);
          this.setState('signedOut');
          return;
        }
      }
    }
    if (allowed) {
      this.user.set(user);
      this.setState('allowed');
      return;
    }
    await this.deny();
  }

  /** Rifiuto: cancella l'account Firebase appena creato (nessuna traccia, R4), esce, mostra l'avviso. */
  private async deny(): Promise<void> {
    this.setState('denied');
    this.user.set(null);
    try {
      await this.backend.deleteCurrentUser();
    } catch {
      // limite noto (R4): se la cancellazione fallisce si esce comunque
    }
    try {
      await this.backend.signOut();
    } catch {
      // ignorato
    }
  }

  private setState(state: AuthState): void {
    this.state.set(state);
    if (state !== 'loading') this.resolveReady();
  }
}
