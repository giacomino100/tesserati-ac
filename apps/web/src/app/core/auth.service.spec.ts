import { TestBed } from '@angular/core/testing';
import { AUTH_BACKEND, type AuthBackend, type SessionUser } from './auth-backend';
import { AuthService } from './auth.service';

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000).toUTCString();

const sessionUser = (over: Partial<SessionUser> = {}): SessionUser => ({
  displayName: 'Utente Prova',
  email: 'autorizzato@example.org',
  emailVerified: true,
  lastSignInTime: hoursAgo(1),
  ...over,
});

/** Backend finto: registra l'ordine delle chiamate e permette di emettere utenti. */
class FakeBackend implements AuthBackend {
  calls: string[] = [];
  allowed = true;
  allowedError: unknown = undefined;
  signInError: unknown = undefined;
  deleteError: unknown = undefined;
  private callback: ((u: SessionUser | null) => void) | undefined;

  onAuthChanged(cb: (u: SessionUser | null) => void): () => void {
    this.callback = cb;
    return () => undefined;
  }
  emit(user: SessionUser | null): void {
    this.callback?.(user);
  }
  async signInWithGoogle(): Promise<void> {
    this.calls.push('signIn');
    if (this.signInError) throw this.signInError;
  }
  async signOut(): Promise<void> {
    this.calls.push('signOut');
    this.callback?.(null);
  }
  async deleteCurrentUser(): Promise<void> {
    this.calls.push('delete');
    if (this.deleteError) throw this.deleteError;
  }
  async isEmailAllowed(): Promise<boolean> {
    this.calls.push('isEmailAllowed');
    if (this.allowedError) throw this.allowedError;
    return this.allowed;
  }
}

function setup() {
  const backend = new FakeBackend();
  TestBed.configureTestingModule({ providers: [{ provide: AUTH_BACKEND, useValue: backend }] });
  const service = TestBed.inject(AuthService);
  return { backend, service };
}

describe('AuthService – accesso (US1)', () => {
  it('parte in stato loading', () => {
    expect(setup().service.state()).toBe('loading');
  });

  it('nessun utente → signedOut', async () => {
    const { backend, service } = setup();
    backend.emit(null);
    await vi.waitFor(() => expect(service.state()).toBe('signedOut'));
  });

  it('utente verificato, in elenco, sessione recente → allowed con il nome', async () => {
    const { backend, service } = setup();
    backend.emit(sessionUser());
    await vi.waitFor(() => expect(service.state()).toBe('allowed'));
    expect(service.user()?.displayName).toBe('Utente Prova');
  });

  it('sessione più vecchia di 7 giorni → signOut e signedOut', async () => {
    const { backend, service } = setup();
    backend.emit(sessionUser({ lastSignInTime: hoursAgo(8 * 24) }));
    await vi.waitFor(() => expect(service.state()).toBe('signedOut'));
    expect(backend.calls).toContain('signOut');
    expect(backend.calls).not.toContain('isEmailAllowed');
  });

  it('signOut() chiama il backend e porta a signedOut', async () => {
    const { backend, service } = setup();
    backend.emit(sessionUser());
    await vi.waitFor(() => expect(service.state()).toBe('allowed'));
    await service.signOut();
    expect(backend.calls).toContain('signOut');
    expect(service.state()).toBe('signedOut');
    expect(service.user()).toBeNull();
  });

  it.each(['auth/popup-closed-by-user', 'auth/cancelled-popup-request'])(
    'accesso annullato (%s) → messaggio e resta signedOut',
    async (code) => {
      const { backend, service } = setup();
      backend.emit(null);
      backend.signInError = { code };
      await service.signIn();
      expect(service.errorMessage()).toBe('Accesso annullato. Riprova.');
      expect(service.state()).toBe('signedOut');
    },
  );

  it('errore di rete → messaggio di connessione', async () => {
    const { backend, service } = setup();
    backend.emit(null);
    backend.signInError = { code: 'auth/network-request-failed' };
    await service.signIn();
    expect(service.errorMessage()).toBe(
      'Impossibile connettersi. Controlla la connessione e riprova.',
    );
  });

  it('errore imprevisto → messaggio generico, senza dati personali', async () => {
    const { backend, service } = setup();
    backend.emit(null);
    backend.signInError = new Error('boom autorizzato@example.org');
    await service.signIn();
    expect(service.errorMessage()).toBe('Qualcosa è andato storto. Riprova tra poco.');
  });

  it('un nuovo tentativo azzera il messaggio precedente', async () => {
    const { backend, service } = setup();
    backend.emit(null);
    backend.signInError = { code: 'auth/popup-closed-by-user' };
    await service.signIn();
    backend.signInError = undefined;
    await service.signIn();
    expect(service.errorMessage()).toBeNull();
  });
});

describe('AuthService – rifiuto (US2)', () => {
  it('email non verificata → delete poi signOut, in quest’ordine, e denied', async () => {
    const { backend, service } = setup();
    backend.emit(sessionUser({ emailVerified: false }));
    await vi.waitFor(() => expect(service.state()).toBe('denied'));
    expect(backend.calls.filter((c) => c === 'delete' || c === 'signOut')).toEqual([
      'delete',
      'signOut',
    ]);
    expect(backend.calls).not.toContain('isEmailAllowed');
  });

  it('email non in elenco → delete poi signOut e denied (e resta denied dopo il signOut)', async () => {
    const { backend, service } = setup();
    backend.allowed = false;
    backend.emit(sessionUser({ email: 'estraneo@example.org' }));
    await vi.waitFor(() => expect(service.state()).toBe('denied'));
    expect(backend.calls.filter((c) => c === 'delete' || c === 'signOut')).toEqual([
      'delete',
      'signOut',
    ]);
    expect(service.user()).toBeNull();
  });

  it('permission-denied dalle regole → denied', async () => {
    const { backend, service } = setup();
    backend.allowedError = { code: 'permission-denied' };
    backend.emit(sessionUser());
    await vi.waitFor(() => expect(service.state()).toBe('denied'));
  });

  it('cancellazione dell’account che fallisce → signOut comunque, ancora denied', async () => {
    const { backend, service } = setup();
    backend.allowed = false;
    backend.deleteError = { code: 'auth/requires-recent-login' };
    backend.emit(sessionUser());
    await vi.waitFor(() => expect(service.state()).toBe('denied'));
    expect(backend.calls).toContain('signOut');
  });

  it('da denied, signOut() riporta a signedOut', async () => {
    const { backend, service } = setup();
    backend.allowed = false;
    backend.emit(sessionUser());
    await vi.waitFor(() => expect(service.state()).toBe('denied'));
    await service.signOut();
    expect(service.state()).toBe('signedOut');
  });

  it('al ricaricamento un utente tolto dall’elenco → denied', async () => {
    const { backend, service } = setup();
    backend.allowed = false;
    backend.emit(sessionUser());
    await vi.waitFor(() => expect(service.state()).toBe('denied'));
  });

  it('revalidate(): email ancora in elenco → resta allowed', async () => {
    const { backend, service } = setup();
    backend.emit(sessionUser());
    await vi.waitFor(() => expect(service.state()).toBe('allowed'));
    await service.revalidate();
    expect(service.state()).toBe('allowed');
  });

  it('revalidate(): email tolta dall’elenco → denied con delete + signOut', async () => {
    const { backend, service } = setup();
    backend.emit(sessionUser());
    await vi.waitFor(() => expect(service.state()).toBe('allowed'));
    backend.calls.length = 0;
    backend.allowed = false;
    await service.revalidate();
    expect(service.state()).toBe('denied');
    expect(backend.calls.filter((c) => c === 'delete' || c === 'signOut')).toEqual([
      'delete',
      'signOut',
    ]);
  });

  it('revalidate(): errore di rete → l’utente resta allowed', async () => {
    const { backend, service } = setup();
    backend.emit(sessionUser());
    await vi.waitFor(() => expect(service.state()).toBe('allowed'));
    backend.allowedError = { code: 'unavailable' };
    await service.revalidate();
    expect(service.state()).toBe('allowed');
  });

  it('revalidate() senza utente entrato non fa nulla', async () => {
    const { backend, service } = setup();
    backend.emit(null);
    await vi.waitFor(() => expect(service.state()).toBe('signedOut'));
    await service.revalidate();
    expect(backend.calls).toEqual([]);
  });
});
