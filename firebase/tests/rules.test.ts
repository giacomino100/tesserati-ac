import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

/**
 * Test delle Security Rules (contracts/firestore-access.md, garanzie A1–A8).
 * Solo email finte `*@example.org`, progetto emulatore `demo-tesseramento`.
 *
 * Nessuna collezione reale usa ancora `isAllowed()`: per osservarla il test inserisce una
 * collezione di prova `probe` subito prima della regola finale "nega tutto".
 */
const RULES_PATH = fileURLToPath(new URL('../firestore.rules', import.meta.url));
const FINAL_RULE = 'match /{document=**}';

function rulesWithProbe(): string {
  const rules = readFileSync(RULES_PATH, 'utf8');
  const at = rules.indexOf(FINAL_RULE);
  if (at < 0) throw new Error(`regola finale "${FINAL_RULE}" non trovata in firestore.rules`);
  const probe = 'match /probe/{id} { allow read: if isAllowed(); }\n    ';
  return rules.slice(0, at) + probe + rules.slice(at);
}

const LISTED = 'autorizzato@example.org';
const STRANGER = 'estraneo@example.org';
const DAY = 24 * 60 * 60;
const nowSeconds = () => Math.floor(Date.now() / 1000);

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-tesseramento',
    firestore: { rules: rulesWithProbe() },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'allowedEmails', LISTED), {});
    await setDoc(doc(db, 'probe', 'x'), { v: 1 });
    await setDoc(doc(db, 'anything', 'x'), { v: 1 });
  });
});

function user(
  email: string,
  options: { verified?: boolean; authTime?: number } = {},
) {
  return env
    .authenticatedContext('uid-' + email, {
      email,
      email_verified: options.verified ?? true,
      auth_time: options.authTime ?? nowSeconds(),
    })
    .firestore();
}

const guest = () => env.unauthenticatedContext().firestore();

describe('A1 – senza accesso nulla è possibile', () => {
  it('nega lettura e scrittura su allowedEmails e su altre collezioni', async () => {
    const db = guest();
    await assertFails(getDoc(doc(db, 'allowedEmails', LISTED)));
    await assertFails(getDocs(collection(db, 'allowedEmails')));
    await assertFails(setDoc(doc(db, 'allowedEmails', 'nuovo@example.org'), {}));
    await assertFails(updateDoc(doc(db, 'allowedEmails', LISTED), { note: 'x' }));
    await assertFails(deleteDoc(doc(db, 'allowedEmails', LISTED)));
    await assertFails(getDoc(doc(db, 'probe', 'x')));
    await assertFails(getDoc(doc(db, 'anything', 'x')));
    await assertFails(setDoc(doc(db, 'anything', 'y'), { v: 2 }));
  });
});

describe('A2 – email non verificata o non in elenco', () => {
  it('email in elenco ma non verificata: nessun accesso, nemmeno al proprio documento', async () => {
    const db = user(LISTED, { verified: false });
    await assertFails(getDoc(doc(db, 'allowedEmails', LISTED)));
    await assertFails(getDoc(doc(db, 'probe', 'x')));
    await assertFails(getDoc(doc(db, 'anything', 'x')));
    await assertFails(setDoc(doc(db, 'anything', 'y'), { v: 2 }));
  });

  it('email verificata ma non in elenco: può solo leggere il proprio documento (inesistente)', async () => {
    const db = user(STRANGER);
    const own = await assertSucceeds(getDoc(doc(db, 'allowedEmails', STRANGER)));
    if (own.exists()) throw new Error('il documento di un estraneo non deve esistere');
    await assertFails(getDoc(doc(db, 'allowedEmails', LISTED)));
    await assertFails(getDoc(doc(db, 'probe', 'x')));
    await assertFails(getDoc(doc(db, 'anything', 'x')));
    await assertFails(setDoc(doc(db, 'anything', 'y'), { v: 2 }));
  });
});

describe('A3 – il confronto dell’email ignora le maiuscole', () => {
  it('token con maiuscole, documento in minuscolo', async () => {
    const db = user('Autorizzato@Example.ORG');
    await assertSucceeds(getDoc(doc(db, 'probe', 'x')));
    await assertSucceeds(getDoc(doc(db, 'allowedEmails', LISTED)));
  });
});

describe('A4 – togliere l’email revoca l’accesso alla richiesta successiva', () => {
  it('lettura ok, poi documento rimosso, poi lettura negata', async () => {
    const db = user(LISTED);
    await assertSucceeds(getDoc(doc(db, 'probe', 'x')));
    await env.withSecurityRulesDisabled(async (ctx) => {
      await deleteDoc(doc(ctx.firestore(), 'allowedEmails', LISTED));
    });
    await assertFails(getDoc(doc(db, 'probe', 'x')));
  });
});

describe('A5 – sessione oltre 7 giorni', () => {
  it('ultimo accesso Google 7 giorni fa meno un minuto: consentito', async () => {
    const db = user(LISTED, { authTime: nowSeconds() - 7 * DAY + 60 });
    await assertSucceeds(getDoc(doc(db, 'probe', 'x')));
    await assertSucceeds(getDoc(doc(db, 'allowedEmails', LISTED)));
  });

  it('ultimo accesso Google 7 giorni fa più un minuto: tutto negato', async () => {
    const db = user(LISTED, { authTime: nowSeconds() - 7 * DAY - 60 });
    await assertFails(getDoc(doc(db, 'probe', 'x')));
    await assertFails(getDoc(doc(db, 'allowedEmails', LISTED)));
  });
});

describe('A6 – l’elenco non è modificabile né enumerabile dagli utenti', () => {
  it('nemmeno un utente autorizzato può scrivere o elencare allowedEmails', async () => {
    const db = user(LISTED);
    await assertFails(setDoc(doc(db, 'allowedEmails', 'nuovo@example.org'), {}));
    await assertFails(setDoc(doc(db, 'allowedEmails', LISTED), { note: 'x' }));
    await assertFails(updateDoc(doc(db, 'allowedEmails', LISTED), { note: 'x' }));
    await assertFails(deleteDoc(doc(db, 'allowedEmails', LISTED)));
    await assertFails(getDocs(collection(db, 'allowedEmails')));
    await assertFails(getDoc(doc(db, 'allowedEmails', 'altro@example.org')));
  });
});

describe('A7 – collezioni non previste', () => {
  it('negate a tutti, anche a un utente autorizzato', async () => {
    const db = user(LISTED);
    await assertFails(getDoc(doc(db, 'anything', 'x')));
    await assertFails(setDoc(doc(db, 'anything', 'y'), { v: 2 }));
    await assertFails(getDoc(doc(db, 'users', 'x')));
    await assertFails(getDocs(collection(db, 'anything')));
  });
});

describe('A8 – elenco vuoto', () => {
  it('nessuno è autorizzato', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await deleteDoc(doc(ctx.firestore(), 'allowedEmails', LISTED));
    });
    const db = user(LISTED);
    await assertFails(getDoc(doc(db, 'probe', 'x')));
    await assertFails(getDoc(doc(db, 'anything', 'x')));
  });
});
