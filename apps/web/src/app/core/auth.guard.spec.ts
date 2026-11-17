import { signal } from '@angular/core';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AuthService, type AuthState } from './auth.service';
import { requireAdmin, requireState } from './auth.guard';

function setup(initial: AuthState) {
  const state = signal<AuthState>(initial);
  const fake = {
    state,
    ready: vi.fn(async () => undefined),
    revalidate: vi.fn(async () => undefined),
  };
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: AuthService, useValue: fake }],
  });
  const router = TestBed.inject(Router);

  const run = async (required: AuthState | 'allowed', url: string, query: Record<string, string> = {}) => {
    const route = { queryParamMap: { get: (k: string) => query[k] ?? null } } as unknown as ActivatedRouteSnapshot;
    const snapshot = { url } as RouterStateSnapshot;
    const result = await TestBed.runInInjectionContext(() => requireState(required)(route, snapshot));
    return result instanceof UrlTree ? router.serializeUrl(result) : result;
  };
  return { state, fake, run };
}

describe('requireState – tabella delle rotte', () => {
  it('signedOut su / → /accesso, ricordando la pagina richiesta', async () => {
    const { run } = setup('signedOut');
    expect(await run('allowed', '/')).toBe('/accesso?returnUrl=%2F');
  });

  it('signedOut su una pagina interna → /accesso con returnUrl', async () => {
    const { run } = setup('signedOut');
    expect(await run('allowed', '/famiglie')).toBe('/accesso?returnUrl=%2Ffamiglie');
  });

  it('allowed su / → consentito', async () => {
    const { run } = setup('allowed');
    expect(await run('allowed', '/')).toBe(true);
  });

  it('allowed su /accesso → / (o la pagina richiesta in returnUrl)', async () => {
    const { run } = setup('allowed');
    expect(await run('signedOut', '/accesso')).toBe('/');
    expect(await run('signedOut', '/accesso', { returnUrl: '/famiglie' })).toBe('/famiglie');
  });

  it('returnUrl esterno o non interno viene ignorato', async () => {
    const { run } = setup('allowed');
    expect(await run('signedOut', '/accesso', { returnUrl: 'https://evil.example' })).toBe('/');
    expect(await run('signedOut', '/accesso', { returnUrl: '//evil.example' })).toBe('/');
  });

  it('denied su / e su /accesso → /non-autorizzato', async () => {
    const { run } = setup('denied');
    expect(await run('allowed', '/')).toBe('/non-autorizzato');
    expect(await run('signedOut', '/accesso')).toBe('/non-autorizzato');
  });

  it('denied su /non-autorizzato → consentito', async () => {
    const { run } = setup('denied');
    expect(await run('denied', '/non-autorizzato')).toBe(true);
  });

  it('signedOut su /non-autorizzato → /accesso; allowed → /', async () => {
    const a = setup('signedOut');
    expect(await a.run('denied', '/non-autorizzato')).toBe('/accesso');
    TestBed.resetTestingModule();
    const b = setup('allowed');
    expect(await b.run('denied', '/non-autorizzato')).toBe('/');
  });

  it('aspetta che lo stato non sia più loading', async () => {
    const { fake, run } = setup('allowed');
    await run('allowed', '/');
    expect(fake.ready).toHaveBeenCalled();
  });
});

describe('requireState – riverifica a ogni navigazione', () => {
  it('verso una pagina protetta chiama revalidate()', async () => {
    const { fake, run } = setup('allowed');
    await run('allowed', '/');
    expect(fake.revalidate).toHaveBeenCalled();
  });

  it('se la riverifica porta a denied, reindirizza a /non-autorizzato', async () => {
    const { state, fake, run } = setup('allowed');
    fake.revalidate.mockImplementation(async () => {
      state.set('denied');
    });
    expect(await run('allowed', '/')).toBe('/non-autorizzato');
  });

  it('verso le pagine di accesso non riverifica', async () => {
    const { fake, run } = setup('signedOut');
    await run('signedOut', '/accesso');
    expect(fake.revalidate).not.toHaveBeenCalled();
  });
});

describe('requireAdmin (013)', () => {
  async function runAdmin(state: AuthState, admin: boolean) {
    const fake = {
      state: signal<AuthState>(state),
      admin: signal(admin),
      ready: vi.fn(async () => undefined),
      revalidate: vi.fn(async () => undefined),
    };
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: fake }] });
    const router = TestBed.inject(Router);
    const route = { queryParamMap: { get: () => null } } as unknown as ActivatedRouteSnapshot;
    const result = await TestBed.runInInjectionContext(() => requireAdmin(route, { url: '/importa' } as RouterStateSnapshot));
    return result instanceof UrlTree ? router.serializeUrl(result) : result;
  }

  it('amministratore → consentito; autorizzato non amministratore → home', async () => {
    expect(await runAdmin('allowed', true)).toBe(true);
    TestBed.resetTestingModule();
    expect(await runAdmin('allowed', false)).toBe('/');
  });

  it('non entrato → accesso', async () => {
    expect(await runAdmin('signedOut', false)).toBe('/accesso?returnUrl=%2Fimporta');
  });
});
