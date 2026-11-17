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
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { SCHEDULE_2026_27 } from '@tesseramento/fees';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

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

/* ------------------------------------------------------------------------------------------
 * Specifica 003 – feeSchedules (contracts/firestore-fee-schedules.md, garanzie F1…F10)
 * ---------------------------------------------------------------------------------------- */

const SEED_PATH = fileURLToPath(new URL('../seed/fee-schedule-2026.json', import.meta.url));
const seed2026 = JSON.parse(readFileSync(SEED_PATH, 'utf8')) as Record<string, unknown> & {
  bands: Record<string, unknown>[];
};

/** Listino valido dell'anno `year` (forma di data-model.md); `over` sostituisce singoli campi. */
function scheduleFor(year: number, over: Record<string, unknown> = {}, email = LISTED) {
  const label = `${year}/${String((year + 1) % 100).padStart(2, '0')}`;
  return withoutUndefined({
    ...seed2026,
    associationYear: year,
    label,
    updatedBy: email,
    updatedAt: serverTimestamp(),
    ...over,
  }) as Record<string, unknown>;
}

/** Toglie i campi `undefined` (nei test significano "campo assente"), anche dentro le fasce. */
function withoutUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutUndefined);
  if (value && typeof value === 'object' && value.constructor === Object) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, withoutUndefined(v)]),
    );
  }
  return value;
}

/** Come `scheduleFor` ma con le quote del 2026 e una modifica a una fascia. */
function withBand(index: number, patch: Record<string, unknown>) {
  return seed2026.bands.map((b, i) => (i === index ? { ...b, ...patch } : b));
}

async function seedSchedules(...years: number[]): Promise<void> {
  await env.withSecurityRulesDisabled(async (ctx) => {
    for (const year of years) {
      await setDoc(doc(ctx.firestore(), 'feeSchedules', String(year)), scheduleFor(year));
    }
  });
}

async function readAll(): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  await env.withSecurityRulesDisabled(async (ctx) => {
    const snap = await getDocs(collection(ctx.firestore(), 'feeSchedules'));
    snap.forEach((d) => (out[d.id] = d.data()));
  });
  return out;
}

describe('F1 – feeSchedules senza accesso', () => {
  beforeEach(() => seedSchedules(2026));

  it('non autenticato, non verificato o non in elenco: nessuna lettura né scrittura', async () => {
    for (const db of [guest(), user(LISTED, { verified: false }), user(STRANGER)]) {
      await assertFails(getDoc(doc(db, 'feeSchedules', '2026')));
      await assertFails(getDocs(collection(db, 'feeSchedules')));
      await assertFails(setDoc(doc(db, 'feeSchedules', '2027'), scheduleFor(2027)));
      await assertFails(updateDoc(doc(db, 'feeSchedules', '2026'), { acrPackageCents: 2600 }));
      await assertFails(deleteDoc(doc(db, 'feeSchedules', '2026')));
    }
  });
});

describe('F2 – lettura da utente autorizzato', () => {
  beforeEach(() => seedSchedules(2026));

  it('legge un listino e l’elenco', async () => {
    const db = user(LISTED);
    const one = await assertSucceeds(getDoc(doc(db, 'feeSchedules', '2026')));
    if (!one.exists()) throw new Error('il listino 2026 deve essere leggibile');
    const all = await assertSucceeds(getDocs(collection(db, 'feeSchedules')));
    if (all.size !== 1) throw new Error('l’elenco deve contenere un listino');
  });

  it('sessione oltre 7 giorni: negato', async () => {
    const db = user(LISTED, { authTime: nowSeconds() - 8 * DAY });
    await assertFails(getDoc(doc(db, 'feeSchedules', '2026')));
    await assertFails(getDocs(collection(db, 'feeSchedules')));
  });
});

describe('F8 – nessuna cancellazione', () => {
  beforeEach(() => seedSchedules(2026));

  it('un utente autorizzato non può cancellare un listino', async () => {
    await assertFails(deleteDoc(doc(user(LISTED), 'feeSchedules', '2026')));
  });
});

describe('F10 – il listino inizializzato coincide con SCHEDULE_2026_27', () => {
  beforeEach(() => seedSchedules(2026));

  it('il documento letto ha le quote del PDF', async () => {
    const snap = await assertSucceeds(getDoc(doc(user(LISTED), 'feeSchedules', '2026')));
    const { updatedAt: _a, updatedBy: _b, ...data } = snap.data() as Record<string, unknown>;
    expect(data).toEqual(JSON.parse(JSON.stringify(SCHEDULE_2026_27)));
  });
});

/** Variazioni non valide di un listino (F5), valide per creazione e modifica. */
const INVALID_VARIANTS: Record<string, Record<string, unknown>> = {
  'pacchetto zero': { acrPackageCents: 0 },
  'pacchetto negativo': { acrPackageCents: -100 },
  'pacchetto non intero': { acrPackageCents: 2500.5 },
  'pacchetto come testo': { acrPackageCents: '2500' },
  'quota piena zero': { bands: withBand(0, { fullCents: 0 }) },
  'quota piena negativa': { bands: withBand(1, { fullCents: -1 }) },
  'quota non intera': { bands: withBand(2, { fullCents: 2200.5 }) },
  'scontata zero': { bands: withBand(3, { discountedCents: 0 }) },
  'scontata maggiore della piena': { bands: withBand(0, { discountedCents: 1501 }) },
  'fascia con campo in più': { bands: withBand(0, { note: 'x' }) },
  'fascia senza quota piena': { bands: withBand(0, { fullCents: undefined }) },
  'quattro fasce in ordine diverso': { bands: [...seed2026.bands].reverse() },
  'tre fasce': { bands: seed2026.bands.slice(0, 3) },
  'adulti con maxAge': { bands: withBand(3, { maxAge: 99 }) },
  'acr senza maxAge': { bands: seed2026.bands.map((b, i) => (i === 0 ? { ...b, maxAge: undefined } : b)) },
  'campo in più nel documento': { note: 'x' },
};

/** Campi che le regole non lasciano cambiare (F6). */
const FIXED_VARIANTS: Record<string, Record<string, unknown>> = {
  'etichetta diversa': { label: '2099/00' },
  'età minima diversa': { minAge: 5 },
  'massimo del nucleo diverso': { maxHouseholdSize: 5 },
  'età minima di una fascia': { bands: withBand(0, { minAge: 5 }) },
  'età massima di una fascia': { bands: withBand(0, { maxAge: 13 }) },
};

describe('F3 – creare l’anno successivo', () => {
  beforeEach(() => seedSchedules(2026));

  it('Y-1 esiste, Y no, valori validi: consentito', async () => {
    const db = user(LISTED);
    await assertSucceeds(setDoc(doc(db, 'feeSchedules', '2027'), scheduleFor(2027)));
  });

  it('con quote cambiate rispetto all’anno precedente: consentito', async () => {
    const db = user(LISTED);
    await assertSucceeds(
      setDoc(
        doc(db, 'feeSchedules', '2027'),
        scheduleFor(2027, { bands: withBand(3, { fullCents: 2700, discountedCents: 2200 }), acrPackageCents: 2600 }),
      ),
    );
  });

  it('dopo il 2027 si può creare il 2028', async () => {
    await seedSchedules(2027);
    await assertSucceeds(setDoc(doc(user(LISTED), 'feeSchedules', '2028'), scheduleFor(2028)));
  });
});

describe('F4 – anni non consentiti', () => {
  beforeEach(() => seedSchedules(2026));

  it('anno saltato (2028 senza 2027): negato', async () => {
    await assertFails(setDoc(doc(user(LISTED), 'feeSchedules', '2028'), scheduleFor(2028)));
  });

  it('anno precedente al primo (2025): negato', async () => {
    await assertFails(setDoc(doc(user(LISTED), 'feeSchedules', '2025'), scheduleFor(2025)));
  });

  it('ID che non è un anno di 4 cifre: negato', async () => {
    const db = user(LISTED);
    for (const id of ['27', '02027', 'abcd', '2027 ', '2027x']) {
      await assertFails(setDoc(doc(db, 'feeSchedules', id), scheduleFor(2027)));
    }
  });

  it('associationYear diverso dall’ID: negato', async () => {
    await assertFails(setDoc(doc(user(LISTED), 'feeSchedules', '2027'), scheduleFor(2027, { associationYear: 2028 })));
    await assertFails(setDoc(doc(user(LISTED), 'feeSchedules', '2027'), scheduleFor(2027, { associationYear: '2027' })));
  });

  it('anno già esistente con regole fisse diverse: negato', async () => {
    await assertFails(setDoc(doc(user(LISTED), 'feeSchedules', '2026'), scheduleFor(2026, { minAge: 5 })));
  });
});

describe('F5 – valori non validi in creazione', () => {
  beforeEach(() => seedSchedules(2026));

  it.each(Object.entries(INVALID_VARIANTS))('negato: %s', async (_name, over) => {
    await assertFails(setDoc(doc(user(LISTED), 'feeSchedules', '2027'), scheduleFor(2027, over)));
  });

  it('campi mancanti: negato', async () => {
    const db = user(LISTED);
    for (const key of ['label', 'minAge', 'maxHouseholdSize', 'acrPackageCents', 'bands', 'updatedBy', 'updatedAt']) {
      await assertFails(setDoc(doc(db, 'feeSchedules', '2027'), scheduleFor(2027, { [key]: undefined })));
    }
  });
});

describe('F6 – regole fisse in creazione', () => {
  beforeEach(() => seedSchedules(2026));

  it.each(Object.entries(FIXED_VARIANTS))('negato: %s', async (_name, over) => {
    await assertFails(setDoc(doc(user(LISTED), 'feeSchedules', '2027'), scheduleFor(2027, over)));
  });

  it('etichetta diversa dall’anno (2027/99): negato', async () => {
    await assertFails(setDoc(doc(user(LISTED), 'feeSchedules', '2027'), scheduleFor(2027, { label: '2027/99' })));
  });
});

describe('F7 – chi e quando in creazione', () => {
  beforeEach(() => seedSchedules(2026));

  it('email falsa o in maiuscolo: negato', async () => {
    const db = user(LISTED);
    await assertFails(setDoc(doc(db, 'feeSchedules', '2027'), scheduleFor(2027, {}, 'altro@example.org')));
    await assertFails(setDoc(doc(db, 'feeSchedules', '2027'), scheduleFor(2027, {}, 'Autorizzato@Example.org')));
  });

  it('data diversa da quella della richiesta: negato', async () => {
    const db = user(LISTED);
    await assertFails(
      setDoc(doc(db, 'feeSchedules', '2027'), scheduleFor(2027, { updatedAt: Timestamp.fromDate(new Date('2020-01-01')) })),
    );
    await assertFails(setDoc(doc(db, 'feeSchedules', '2027'), scheduleFor(2027, { updatedAt: 'ora' })));
  });

  it('l’email con maiuscole nel token è accettata se updatedBy è in minuscolo', async () => {
    const db = user('Autorizzato@Example.ORG');
    await assertSucceeds(setDoc(doc(db, 'feeSchedules', '2027'), scheduleFor(2027)));
  });
});

/** Campi di una modifica valida: nuove quote più chi e quando. */
function edit(over: Record<string, unknown> = {}, email = LISTED) {
  return withoutUndefined({ updatedBy: email, updatedAt: serverTimestamp(), ...over }) as Record<string, unknown>;
}

describe('F7 – modificare le sole quote', () => {
  beforeEach(() => seedSchedules(2026));

  it('quote valide con updatedBy e updatedAt della richiesta: consentito', async () => {
    const db = user(LISTED);
    await assertSucceeds(
      updateDoc(
        doc(db, 'feeSchedules', '2026'),
        edit({ acrPackageCents: 2600, bands: withBand(3, { fullCents: 2700, discountedCents: 2200 }) }),
      ),
    );
    const snap = await assertSucceeds(getDoc(doc(db, 'feeSchedules', '2026')));
    expect(snap.get('acrPackageCents')).toBe(2600);
  });

  it('modifica con una scrittura completa (setDoc) e quota scontata uguale alla piena: consentito', async () => {
    await assertSucceeds(
      setDoc(doc(user(LISTED), 'feeSchedules', '2026'), scheduleFor(2026, { bands: withBand(0, { discountedCents: 1500 }) })),
    );
  });

  it('email falsa o in maiuscolo: negato', async () => {
    const db = user(LISTED);
    await assertFails(updateDoc(doc(db, 'feeSchedules', '2026'), edit({ acrPackageCents: 2600 }, 'altro@example.org')));
    await assertFails(updateDoc(doc(db, 'feeSchedules', '2026'), edit({ acrPackageCents: 2600 }, 'Autorizzato@Example.org')));
  });

  it('data vecchia o assente: negato', async () => {
    const db = user(LISTED);
    await assertFails(
      updateDoc(doc(db, 'feeSchedules', '2026'), edit({ acrPackageCents: 2600, updatedAt: Timestamp.fromDate(new Date('2020-01-01')) })),
    );
    await assertFails(updateDoc(doc(db, 'feeSchedules', '2026'), { acrPackageCents: 2600 }));
  });
});

describe('F5 – valori non validi in modifica', () => {
  beforeEach(() => seedSchedules(2026));

  it.each(Object.entries(INVALID_VARIANTS))('negato: %s', async (_name, over) => {
    await assertFails(setDoc(doc(user(LISTED), 'feeSchedules', '2026'), scheduleFor(2026, over)));
  });
});

describe('F6 – regole fisse in modifica', () => {
  beforeEach(() => seedSchedules(2026));

  it.each(Object.entries(FIXED_VARIANTS))('negato: %s', async (_name, over) => {
    await assertFails(setDoc(doc(user(LISTED), 'feeSchedules', '2026'), scheduleFor(2026, over)));
    await assertFails(updateDoc(doc(user(LISTED), 'feeSchedules', '2026'), edit(over)));
  });

  it('cambiare associationYear o il nome di una fascia: negato', async () => {
    const db = user(LISTED);
    await assertFails(updateDoc(doc(db, 'feeSchedules', '2026'), edit({ associationYear: 2027 })));
    await assertFails(updateDoc(doc(db, 'feeSchedules', '2026'), edit({ bands: withBand(0, { band: 'giovani' }) })));
  });
});

describe('F8 – la cancellazione resta negata con le regole di modifica', () => {
  it('nessuno cancella un listino, nemmeno dopo averlo modificato', async () => {
    await seedSchedules(2026);
    const db = user(LISTED);
    await assertSucceeds(updateDoc(doc(db, 'feeSchedules', '2026'), edit({ acrPackageCents: 2600 })));
    await assertFails(deleteDoc(doc(db, 'feeSchedules', '2026')));
  });
});

describe('F9 – gli altri anni non cambiano', () => {
  it('modificare il 2027 lascia il 2026 identico', async () => {
    await seedSchedules(2026, 2027);
    const before = await readAll();
    await assertSucceeds(updateDoc(doc(user(LISTED), 'feeSchedules', '2027'), edit({ acrPackageCents: 2700 })));
    const after = await readAll();
    expect(after['2026']).toEqual(before['2026']);
    expect(after['2027']).not.toEqual(before['2027']);
  });
});

describe('F9 – gli altri anni non cambiano (creazione)', () => {
  it('creare il 2027 lascia il 2026 identico', async () => {
    await seedSchedules(2026);
    const before = await readAll();
    await assertSucceeds(setDoc(doc(user(LISTED), 'feeSchedules', '2027'), scheduleFor(2027, { acrPackageCents: 2600 })));
    const after = await readAll();
    expect(after['2026']).toEqual(before['2026']);
    expect(Object.keys(after).sort()).toEqual(['2026', '2027']);
  });
});

/* ----------------------------------------------------------------------------------------
 * Specifica 004 – import ACR: importBatches, persons, adhesions (contracts/firestore-import.md, I1–I11).
 * Solo nomi inventati.
 * ---------------------------------------------------------------------------------------- */

type Db = ReturnType<typeof user>;
type Docs = Record<string, Record<string, unknown>>;

/** Segno di import valido dell'anno. */
function batchFor(year: number, over: Record<string, unknown> = {}, count = 15, list = 'ACR') {
  return withoutUndefined({
    associationYear: year,
    source: list,
    importedAt: serverTimestamp(),
    importedBy: LISTED,
    adhesionCount: count,
    newPersonCount: count,
    skippedRowCount: 0,
    ...over,
  }) as Record<string, unknown>;
}

function personFor(i: number, year = 2026, over: Record<string, unknown> = {}, list = 'ACR') {
  return withoutUndefined({
    lastName: `PROVA${i}`,
    firstName: 'ALFA',
    birthDate: '2016-04-09',
    identityKey: `PROVA${i}|ALFA|2016-04-09`,
    sex: 'F',
    createdInImport: `${year}-${list}`,
    ...over,
  }) as Record<string, unknown>;
}

function adhesionFor(personId: string, year = 2026, over: Record<string, unknown> = {}, list = 'ACR') {
  return withoutUndefined({
    personId,
    associationYear: year,
    importId: `${year}-${list}`,
    sector: 'RAGAZZI',
    exportAgeBand: '9/11',
    bond: 'C3',
    bondId: '900002',
    ...over,
  }) as Record<string, unknown>;
}

/** Documenti di un import completo: segno + n persone nuove + n adesioni. */
function fullImport(year = 2026, n = 15, list = 'ACR'): Docs {
  const docs: Docs = { [`importBatches/${year}-${list}`]: batchFor(year, {}, n, list) };
  for (let i = 1; i <= n; i++) {
    const id = `p${year}-${list}-${i}`;
    docs[`persons/${id}`] = personFor(i, year, { identityKey: `PROVA${i}|${list}|2016-04-09` }, list);
    docs[`adhesions/${year}_${id}`] = adhesionFor(id, year, {}, list);
  }
  return docs;
}

/** Scrive tutti i documenti in un'unica scrittura atomica (come la transazione dell'app). */
function commitAll(db: Db, docs: Docs) {
  const batch = writeBatch(db);
  for (const [path, data] of Object.entries(docs)) batch.set(doc(db, path), data);
  return batch.commit();
}

async function seedDocs(docs: Docs): Promise<void> {
  await env.withSecurityRulesDisabled(async (ctx) => {
    for (const [path, data] of Object.entries(docs)) {
      const plain = { ...data };
      if ('importedAt' in plain) plain['importedAt'] = Timestamp.now();
      await setDoc(doc(ctx.firestore(), path), plain);
    }
  });
}

async function countImportDocs(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  await env.withSecurityRulesDisabled(async (ctx) => {
    for (const name of ['importBatches', 'persons', 'adhesions']) {
      out[name] = (await getDocs(collection(ctx.firestore(), name))).size;
    }
  });
  return out;
}

/** Un import minimo esistente: segno 2026, persona p1, adesione 2026_p1. */
const EXISTING: Docs = {
  'importBatches/2026-ACR': batchFor(2026, {}, 1),
  'persons/p1': personFor(1),
  'adhesions/2026_p1': adhesionFor('p1'),
};

/** Import di una sola riga per il 2026 con persona `p1` (ID fissi per le varianti). */
function oneRowImport(): Docs {
  return {
    'importBatches/2026-ACR': batchFor(2026, {}, 1),
    'persons/p1': personFor(1),
    'adhesions/2026_p1': adhesionFor('p1'),
  };
}

describe('I1 – import: senza accesso nulla è possibile', () => {
  beforeEach(async () => {
    await seedSchedules(2026, 2027);
    await seedDocs(EXISTING);
  });

  const who: [string, () => Db][] = [
    ['non autenticato', () => guest()],
    ['non in elenco', () => user(STRANGER)],
    ['email non verificata', () => user(LISTED, { verified: false })],
  ];

  for (const [name, db] of who) {
    it(`${name}: niente lettura né scrittura`, async () => {
      const d = db();
      for (const path of Object.keys(EXISTING)) await assertFails(getDoc(doc(d, path)));
      for (const coll of ['importBatches', 'persons', 'adhesions']) await assertFails(getDocs(collection(d, coll)));
      await assertFails(commitAll(d, fullImport(2027, 2)));
      expect(await countImportDocs()).toEqual({ importBatches: 1, persons: 1, adhesions: 1 });
    });
  }
});

describe('I2 – import: lettura da utente autorizzato', () => {
  beforeEach(async () => {
    await seedSchedules(2026);
    await seedDocs(EXISTING);
  });

  it('legge segni di import, persone e adesioni', async () => {
    const db = user(LISTED);
    for (const path of Object.keys(EXISTING)) await assertSucceeds(getDoc(doc(db, path)));
    for (const coll of ['importBatches', 'persons', 'adhesions']) await assertSucceeds(getDocs(collection(db, coll)));
  });
});

describe('I3/I4 – import completo in una sola scrittura', () => {
  beforeEach(() => seedSchedules(2026, 2027));

  it('15 persone + 15 adesioni + segno: consentito', async () => {
    await assertSucceeds(commitAll(user(LISTED), fullImport(2026, 15)));
    expect(await countImportDocs()).toEqual({ importBatches: 1, persons: 15, adhesions: 15 });
  });

  it('89 persone + 89 adesioni + segno (dimensione dell’export reale): consentito', async () => {
    await assertSucceeds(commitAll(user(LISTED), fullImport(2026, 89)));
    expect(await countImportDocs()).toEqual({ importBatches: 1, persons: 89, adhesions: 89 });
  });

  it('anno successivo con una persona già presente: solo segno e adesione', async () => {
    await seedDocs(EXISTING);
    await assertSucceeds(
      commitAll(user(LISTED), {
        'importBatches/2027-ACR': batchFor(2027, { newPersonCount: 0 }, 1),
        'adhesions/2027_p1': adhesionFor('p1', 2027),
      }),
    );
    expect(await countImportDocs()).toEqual({ importBatches: 2, persons: 1, adhesions: 2 });
  });

  it('dati facoltativi assenti (sesso, fascia, legame): consentito', async () => {
    const docs = oneRowImport();
    docs['persons/p1'] = personFor(1, 2026, { sex: undefined });
    docs['adhesions/2026_p1'] = adhesionFor('p1', 2026, { exportAgeBand: undefined, bond: undefined, bondId: undefined });
    await assertSucceeds(commitAll(user(LISTED), docs));
  });

  it('codice fiscale di 16 caratteri: consentito', async () => {
    const docs = oneRowImport();
    docs['persons/p1'] = personFor(1, 2026, { taxCode: 'PRVLFA16D49G348X' });
    await assertSucceeds(commitAll(user(LISTED), docs));
  });

  it('email con maiuscole nel token: consentito con email in minuscolo', async () => {
    await assertSucceeds(commitAll(user('Autorizzato@Example.ORG'), oneRowImport()));
  });
});

describe('I7 – persone e adesioni solo insieme a un nuovo segno di import', () => {
  beforeEach(() => seedSchedules(2026));

  it('persona o adesione da sole: negato', async () => {
    const db = user(LISTED);
    await assertFails(setDoc(doc(db, 'persons/p1'), personFor(1)));
    await assertFails(setDoc(doc(db, 'adhesions/2026_p1'), adhesionFor('p1')));
  });

  it('persona o adesione legate a un segno già esistente: negato', async () => {
    await seedDocs({ 'importBatches/2026-ACR': batchFor(2026) });
    const db = user(LISTED);
    await assertFails(setDoc(doc(db, 'persons/p1'), personFor(1)));
    await assertFails(setDoc(doc(db, 'adhesions/2026_p1'), adhesionFor('p1')));
  });

  it('persona legata a un segno diverso da quello scritto: negato', async () => {
    const docs = oneRowImport();
    docs['persons/p1'] = personFor(1, 2026, { createdInImport: '2025-ACR' });
    await assertFails(commitAll(user(LISTED), docs));
  });
});

describe('I8 – campi in più o tipi errati', () => {
  beforeEach(() => seedSchedules(2026));

  const variants: Record<string, (docs: Docs) => void> = {
    'persona con indirizzo': (d) => (d['persons/p1'] = { ...personFor(1), address: 'VIA DI PROVA 1' }),
    'persona con telefono': (d) => (d['persons/p1'] = { ...personFor(1), phone: '0910000000' }),
    'adesione con Pagato': (d) => (d['adhesions/2026_p1'] = { ...adhesionFor('p1'), paid: true }),
    'adesione con MLAC': (d) => (d['adhesions/2026_p1'] = { ...adhesionFor('p1'), mlac: 0 }),
    'segno con campo in più': (d) => (d['importBatches/2026-ACR'] = { ...batchFor(2026, {}, 1), note: 'x' }),
    'data di nascita numerica': (d) => (d['persons/p1'] = personFor(1, 2026, { birthDate: 19650312 })),
    'data di nascita in altro formato': (d) => (d['persons/p1'] = personFor(1, 2026, { birthDate: '12/03/1965' })),
    'sesso non valido': (d) => (d['persons/p1'] = personFor(1, 2026, { sex: 'X' })),
    'codice fiscale corto': (d) => (d['persons/p1'] = personFor(1, 2026, { taxCode: 'ABC' })),
    'cognome vuoto': (d) => (d['persons/p1'] = personFor(1, 2026, { lastName: '' })),
    'chiave di identità assente': (d) => (d['persons/p1'] = personFor(1, 2026, { identityKey: undefined })),
    'anno dell’adesione come testo': (d) => (d['adhesions/2026_p1'] = adhesionFor('p1', 2026, { associationYear: '2026' })),
    'anno del segno come testo': (d) => (d['importBatches/2026-ACR'] = batchFor(2026, { associationYear: '2026' }, 1)),
    'settore vuoto': (d) => (d['adhesions/2026_p1'] = adhesionFor('p1', 2026, { sector: '' })),
    'N. legame numerico': (d) => (d['adhesions/2026_p1'] = adhesionFor('p1', 2026, { bondId: 900002 })),
    'zero adesioni': (d) => (d['importBatches/2026-ACR'] = batchFor(2026, { adhesionCount: 0 }, 1)),
    'conteggio negativo': (d) => (d['importBatches/2026-ACR'] = batchFor(2026, { skippedRowCount: -1 }, 1)),
    'sorgente diversa': (d) => (d['importBatches/2026-ACR'] = batchFor(2026, { source: 'GIOVANI' }, 1)),
  };

  for (const [name, mutate] of Object.entries(variants)) {
    it(`${name}: negato`, async () => {
      const docs = oneRowImport();
      mutate(docs);
      await assertFails(commitAll(user(LISTED), docs));
      expect(await countImportDocs()).toEqual({ importBatches: 0, persons: 0, adhesions: 0 });
    });
  }
});

describe('I9 – ID incoerenti', () => {
  beforeEach(() => seedSchedules(2026, 2027));

  it('ID dell’adesione diverso da {anno}_{persona}: negato', async () => {
    const docs = oneRowImport();
    delete docs['adhesions/2026_p1'];
    docs['adhesions/2026_altro'] = adhesionFor('p1');
    await assertFails(commitAll(user(LISTED), docs));
  });

  it('importId diverso da {anno}-ACR: negato', async () => {
    const docs = oneRowImport();
    docs['adhesions/2026_p1'] = adhesionFor('p1', 2026, { importId: '2027-ACR' });
    docs['importBatches/2027-ACR'] = batchFor(2027, {}, 1);
    await assertFails(commitAll(user(LISTED), docs));
  });

  it('ID del segno diverso da {anno}-ACR: negato', async () => {
    await assertFails(setDoc(doc(user(LISTED), 'importBatches/2026'), batchFor(2026)));
    await assertFails(setDoc(doc(user(LISTED), 'importBatches/2027-ACR'), batchFor(2026)));
  });
});

describe('I10 – nessuna modifica né cancellazione', () => {
  beforeEach(async () => {
    await seedSchedules(2026);
    await seedDocs(EXISTING);
  });

  it('modifica e cancellazione negate', async () => {
    const db = user(LISTED);
    await assertFails(updateDoc(doc(db, 'importBatches/2026-ACR'), { adhesionCount: 99 }));
    await assertFails(updateDoc(doc(db, 'persons/p1'), { firstName: 'BETA' }));
    await assertFails(updateDoc(doc(db, 'adhesions/2026_p1'), { sector: 'GIOVANI' }));
    for (const path of Object.keys(EXISTING)) await assertFails(deleteDoc(doc(db, path)));
  });
});

describe('I11 – chi e quando', () => {
  beforeEach(() => seedSchedules(2026));

  it('email diversa dall’utente: negato', async () => {
    const docs = oneRowImport();
    docs['importBatches/2026-ACR'] = batchFor(2026, { importedBy: 'altro@example.org' }, 1);
    await assertFails(commitAll(user(LISTED), docs));
  });

  it('data scelta dal client invece dell’ora del server: negato', async () => {
    const docs = oneRowImport();
    docs['importBatches/2026-ACR'] = batchFor(2026, { importedAt: Timestamp.fromDate(new Date('2026-01-01')) }, 1);
    await assertFails(commitAll(user(LISTED), docs));
  });
});

describe('I5 – riimporto dello stesso anno', () => {
  beforeEach(async () => {
    await seedSchedules(2026);
    await seedDocs(EXISTING);
  });

  it('secondo import del 2026: negato e nulla cambia', async () => {
    const docs = fullImport(2026, 2);
    await assertFails(commitAll(user(LISTED), docs));
    expect(await countImportDocs()).toEqual({ importBatches: 1, persons: 1, adhesions: 1 });
  });
});

describe('I6 – anno senza listino', () => {
  beforeEach(() => seedSchedules(2026));

  it('import del 2030 senza feeSchedules/2030: negato', async () => {
    await assertFails(commitAll(user(LISTED), fullImport(2030, 1)));
    expect(await countImportDocs()).toEqual({ importBatches: 0, persons: 0, adhesions: 0 });
  });
});

/* Specifica 005 – elenchi Giovani e Adulti (contracts/firestore-import-changes.md, I12–I16). */

describe('I12 – import completo Giovani e Adulti', () => {
  beforeEach(() => seedSchedules(2026));

  it('Giovani e Adulti del 2026, anche dopo l’ACR: consentito', async () => {
    await assertSucceeds(commitAll(user(LISTED), fullImport(2026, 3, 'ACR')));
    await assertSucceeds(commitAll(user(LISTED), fullImport(2026, 8, 'GIOVANI')));
    await assertSucceeds(commitAll(user(LISTED), fullImport(2026, 14, 'ADULTI')));
    expect(await countImportDocs()).toEqual({ importBatches: 3, persons: 25, adhesions: 25 });
  });

  it('non autenticato o non in elenco: import Giovani negato (SC-006)', async () => {
    await assertFails(commitAll(guest(), fullImport(2026, 2, 'GIOVANI')));
    await assertFails(commitAll(user(STRANGER), fullImport(2026, 2, 'GIOVANI')));
    expect(await countImportDocs()).toEqual({ importBatches: 0, persons: 0, adhesions: 0 });
  });
});

describe('I13 – Giovani dopo ACR con una persona già esistente', () => {
  beforeEach(async () => {
    await seedSchedules(2026);
    await seedDocs({ 'importBatches/2025-ACR': batchFor(2025, {}, 1), 'persons/p1': personFor(1, 2025), 'adhesions/2025_p1': adhesionFor('p1', 2025) });
    await seedDocs({ 'importBatches/2026-ACR': batchFor(2026, {}, 1), 'persons/p2': personFor(2), 'adhesions/2026_p2': adhesionFor('p2') });
  });

  it('solo segno e adesione per la persona riusata: consentito', async () => {
    await assertSucceeds(
      commitAll(user(LISTED), {
        'importBatches/2026-GIOVANI': batchFor(2026, { newPersonCount: 0 }, 1, 'GIOVANI'),
        'adhesions/2026_p1': adhesionFor('p1', 2026, { sector: 'GIOVANI' }, 'GIOVANI'),
      }),
    );
  });
});

describe('I14 – secondo import dello stesso elenco', () => {
  beforeEach(async () => {
    await seedSchedules(2026);
    await seedDocs({ 'importBatches/2026-GIOVANI': batchFor(2026, {}, 1, 'GIOVANI') });
  });

  it('secondo Giovani 2026: negato', async () => {
    await assertFails(commitAll(user(LISTED), fullImport(2026, 2, 'GIOVANI')));
    expect(await countImportDocs()).toEqual({ importBatches: 1, persons: 0, adhesions: 0 });
  });
});

describe('I15 – una sola adesione per persona per anno', () => {
  beforeEach(async () => {
    await seedSchedules(2026);
    await seedDocs(EXISTING);
  });

  it('adesione Giovani 2026 per chi ha già l’adesione ACR 2026: negato e nulla cambia', async () => {
    await assertFails(
      commitAll(user(LISTED), {
        'importBatches/2026-GIOVANI': batchFor(2026, { newPersonCount: 0 }, 1, 'GIOVANI'),
        'adhesions/2026_p1': adhesionFor('p1', 2026, { sector: 'GIOVANI' }, 'GIOVANI'),
      }),
    );
    expect(await countImportDocs()).toEqual({ importBatches: 1, persons: 1, adhesions: 1 });
  });
});

describe('I16 – elenchi non validi', () => {
  beforeEach(() => seedSchedules(2026));

  it('source sconosciuto: negato', async () => {
    const docs = fullImport(2026, 1, 'ALTRO');
    await assertFails(commitAll(user(LISTED), docs));
  });

  it('ID con un elenco diverso dal source: negato', async () => {
    const docs = fullImport(2026, 1, 'GIOVANI');
    docs['importBatches/2026-GIOVANI'] = batchFor(2026, { source: 'ADULTI' }, 1, 'GIOVANI');
    await assertFails(commitAll(user(LISTED), docs));
  });

  it('importId dell’adesione con elenco sconosciuto: negato', async () => {
    const docs = fullImport(2026, 1, 'GIOVANI');
    const [path] = Object.keys(docs).filter((k) => k.startsWith('adhesions/'));
    docs[path!] = { ...docs[path!], importId: '2026-ALTRO' };
    await assertFails(commitAll(user(LISTED), docs));
  });
});
