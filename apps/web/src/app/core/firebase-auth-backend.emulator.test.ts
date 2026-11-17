/**
 * Integrazione sugli emulatori Auth e Firestore (ricerca R4, quickstart verifica 5).
 * Non fa parte di `npm test -w web`: si lancia con `npm run test:integration -w web`,
 * che avvia gli emulatori sul progetto `demo-tesseramento`. Solo email finte `*@example.org`.
 *
 * Il popup di Google non è automatizzabile: si accede sull'emulatore Auth con una credenziale
 * Google finta e si lascia che AuthService reagisca al cambio di stato.
 */
import { TestBed } from '@angular/core/testing';
import { GoogleAuthProvider, signInWithCredential, signOut } from 'firebase/auth';
import { AUTH_BACKEND } from './auth-backend';
import { AuthService } from './auth.service';
import { auth } from './firebase';
import { FirebaseAuthBackend } from './firebase-auth-backend';

const PROJECT = 'demo-tesseramento';
const AUTH_EMULATOR = `http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}`;
const FIRESTORE_EMULATOR = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;

const LISTED = 'autorizzato@example.org';
const STRANGER = 'estraneo@example.org';

async function seedAllowedEmail(email: string): Promise<void> {
  // "Bearer owner" aggira le regole sull'emulatore: è l'equivalente della console.
  const response = await fetch(`${FIRESTORE_EMULATOR}/allowedEmails/${encodeURIComponent(email)}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: {} }),
  });
  if (!response.ok) throw new Error(`seed fallito: ${response.status}`);
}

async function clearEmulators(): Promise<void> {
  await fetch(`${AUTH_EMULATOR}/accounts`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
    method: 'DELETE',
  });
}

async function accountEmails(): Promise<string[]> {
  const response = await fetch(`${AUTH_EMULATOR}/accounts`, {
    headers: { Authorization: 'Bearer owner' },
  });
  const body = (await response.json()) as { userInfo?: { email?: string }[] };
  return (body.userInfo ?? []).map((u) => u.email ?? '');
}

function googleCredential(email: string) {
  return GoogleAuthProvider.credential(
    JSON.stringify({ sub: `sub-${email}`, email, email_verified: true, name: 'Utente Prova' }),
  );
}

describe('FirebaseAuthBackend sugli emulatori', () => {
  beforeEach(async () => {
    await signOut(auth);
    await clearEmulators();
    TestBed.configureTestingModule({
      providers: [{ provide: AUTH_BACKEND, useFactory: () => new FirebaseAuthBackend() }],
    });
  });

  it('account non in elenco → denied e account cancellato dall’emulatore Auth (nessuna traccia)', async () => {
    const service = TestBed.inject(AuthService);
    await signInWithCredential(auth, googleCredential(STRANGER));
    await vi.waitFor(() => expect(service.state()).toBe('denied'), { timeout: 10000 });
    await vi.waitFor(async () => expect(await accountEmails()).not.toContain(STRANGER), {
      timeout: 10000,
    });
  });

  it('account in elenco → allowed', async () => {
    await seedAllowedEmail(LISTED);
    const service = TestBed.inject(AuthService);
    await signInWithCredential(auth, googleCredential(LISTED));
    await vi.waitFor(() => expect(service.state()).toBe('allowed'), { timeout: 10000 });
    expect(service.user()?.email).toBe(LISTED);
  });

  it('email tolta dall’elenco dopo l’ingresso → revalidate() porta a denied', async () => {
    await seedAllowedEmail(LISTED);
    const service = TestBed.inject(AuthService);
    await signInWithCredential(auth, googleCredential(LISTED));
    await vi.waitFor(() => expect(service.state()).toBe('allowed'), { timeout: 10000 });
    await fetch(`${FIRESTORE_EMULATOR}/allowedEmails/${encodeURIComponent(LISTED)}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer owner' },
    });
    await service.revalidate();
    expect(service.state()).toBe('denied');
  });
});
