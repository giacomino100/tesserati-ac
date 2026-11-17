/**
 * Integrazione del backend della pagina Tesserati sugli emulatori (specifica 013, E1–E3).
 * Non fa parte di `npm test -w web`: si lancia con `npm run test:integration -w web`.
 * Solo ID inventati ed email `*@example.org`.
 */
import { GoogleAuthProvider, signInWithCredential, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { SCHEDULE_2026_27 } from '@tesseramento/fees';
import { auth, db } from '../core/firebase';
import { FirebaseAuthBackend } from '../core/firebase-auth-backend';
import { scheduleToDocument } from '../listini/schedule-mapper';
import { FirestoreYearBackend } from './firestore-year-backend';

const PROJECT = 'demo-tesseramento';
const LISTED = 'autorizzato@example.org';
const BASE = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;

type Json = Record<string, unknown>;

function toValue(v: unknown): Json {
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  return { mapValue: { fields: toFields(v as Json) } };
}
function toFields(o: Json): Json {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => [k, toValue(v)]));
}

async function put(path: string, data: Json): Promise<void> {
  const response = await fetch(`${BASE}/${path}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFields(data) }),
  });
  if (!response.ok) throw new Error(`seed fallito: ${response.status}`);
}

async function clear(): Promise<void> {
  await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
}

async function signIn(): Promise<void> {
  await signInWithCredential(
    auth,
    GoogleAuthProvider.credential(JSON.stringify({ sub: 'sub-1', email: LISTED, email_verified: true, name: 'Utente Prova' })),
  );
}

/** Due persone del N. Legame 900003 con adesione 2026 importata; listini 2026 e 2027. */
async function seed(): Promise<void> {
  for (const year of [2026, 2027]) {
    await put(`feeSchedules/${year}`, {
      ...scheduleToDocument({ ...SCHEDULE_2026_27, associationYear: year, label: `${year}/${String((year + 1) % 100).padStart(2, '0')}` }, 'seed@example.org'),
      updatedAt: new Date('2026-11-17T10:00:00Z'),
    });
  }
  for (const [id, first] of [['a', 'LUCA'], ['b', 'MARTA']] as const) {
    await put(`persons/${id}`, { lastName: 'GALLO', firstName: first, birthDate: '1980-01-01', identityKey: `GALLO|${first}|1980-01-01`, createdInImport: '2026-ADULTI' });
    await put(`adhesions/2026_${id}`, { personId: id, associationYear: 2026, importId: '2026-ADULTI', sector: 'ADULTI', bond: 'C2', bondId: '900003' });
  }
}

describe('FirestoreYearBackend sugli emulatori', () => {
  const backend = new FirestoreYearBackend();

  beforeEach(async () => {
    await signOut(auth);
    await clear();
    await put(`allowedEmails/${LISTED}`, {});
    await seed();
    await signIn();
  });

  afterAll(async () => {
    await signOut(auth);
  });

  it('E1 – conferma con il pagamento e famiglia del N. Legame', async () => {
    const draft = (personId: string) => ({ personId, associationYear: 2027, list: 'ADULTI' as const, bond: 'C2', bondId: '900003' });
    await backend.renew([draft('a')], '2026-11-17', 'Autorizzato@Example.org');
    const adhesion = (await getDoc(doc(db, 'adhesions/2027_a'))).data();
    expect(adhesion).toMatchObject({ origin: 'riconferma', paidOn: '2026-11-17', paidBy: LISTED });
    const members = await backend.yearMembers(2027);
    expect(members[0]).toMatchObject({ personId: 'a', paidOn: '2026-11-17', origin: 'riconferma' });

    await backend.renew([draft('b')], '2026-11-17', LISTED);
    await backend.confirmFamily({ associationYear: 2027, memberIds: ['a', 'b'], origin: 'legame', bondId: '900003' }, LISTED);
    expect((await backend.confirmedFamilies(2027))[0]).toMatchObject({ memberIds: ['a', 'b'], bondId: '900003' });
    expect((await backend.memberships(2027)).get('b')).toBeDefined();
  });

  it('E2 – registra pagamento e familyOptOut', async () => {
    await put('adhesions/2027_a', {
      personId: 'a', associationYear: 2027, origin: 'riconferma', list: 'ADULTI', sector: 'ADULTI', renewedFrom: 2026,
      renewedAt: new Date(), renewedBy: LISTED,
    });
    expect((await backend.yearMembers(2027))[0]?.paidOn).toBeUndefined();
    await backend.registerPayment(2027, ['a'], '2026-11-16', LISTED);
    await backend.setFamilyOptOut(2027, 'a', true);
    expect((await backend.yearMembers(2027))[0]).toMatchObject({ paidOn: '2026-11-16', familyOptOut: true });
    await backend.setFamilyOptOut(2027, 'a', false);
    expect((await backend.yearMembers(2027))[0]?.familyOptOut).toBeUndefined();
  });

  it('E3 – amministratore solo con admin: true', async () => {
    const access = new FirebaseAuthBackend();
    expect(await access.isAdmin(LISTED)).toBe(false);
    await put(`allowedEmails/${LISTED}`, { admin: true });
    expect(await access.isAdmin(LISTED)).toBe(true);
  });
});
