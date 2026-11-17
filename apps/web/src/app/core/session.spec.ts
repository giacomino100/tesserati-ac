import { isSessionExpired, normalizeEmail, SESSION_MAX_AGE_MS } from './session';

describe('normalizeEmail', () => {
  it('toglie gli spazi e porta in minuscolo', () => {
    expect(normalizeEmail(' Mario@Example.ORG ')).toBe('mario@example.org');
  });
});

describe('isSessionExpired', () => {
  const now = new Date('2026-11-17T12:00:00Z');
  const ago = (ms: number) => new Date(now.getTime() - ms).toUTCString();

  it('7 giorni esatti: non scaduta', () => {
    expect(isSessionExpired(ago(SESSION_MAX_AGE_MS), now)).toBe(false);
  });

  it('7 giorni e 1 secondo: scaduta', () => {
    expect(isSessionExpired(ago(SESSION_MAX_AGE_MS + 1000), now)).toBe(true);
  });

  it('1 ora: non scaduta', () => {
    expect(isSessionExpired(ago(60 * 60 * 1000), now)).toBe(false);
  });

  it('data non interpretabile o assente: scaduta', () => {
    expect(isSessionExpired('non è una data', now)).toBe(true);
    expect(isSessionExpired(undefined, now)).toBe(true);
  });

  it('la durata massima è di 7 giorni', () => {
    expect(SESSION_MAX_AGE_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
