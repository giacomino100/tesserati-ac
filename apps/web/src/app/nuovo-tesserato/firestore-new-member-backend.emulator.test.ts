/**
 * Integrazione del backend del nuovo tesserato sugli emulatori (specifica 009, E1–E4).
 * Non fa parte di `npm test -w web`: si lancia con `npm run test:integration -w web`.
 * Solo nomi inventati ed email `*@example.org`.
 */
import { GoogleAuthProvider, signInWithCredential, signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { SCHEDULE_2026_27 } from '@tesseramento/fees';
import { validateNewMember } from '@tesseramento/import';
import { auth, db } from '../core/firebase';
import { memberYears } from '../core/member-years';
import { scheduleToDocument } from '../listini/schedule-mapper';
import { FirestoreRenewalsBackend } from '../riconferme/firestore-renewals-backend';
import { FirestoreNewMemberBackend } from './firestore-new-member-backend';
import { AlreadyEnrolledError, RenewableError } from './new-member-backend';

const PROJECT = 'demo-tesseramento';
const LISTED = 'autorizzato@example.org';
const BASE = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;

async function clear(): Promise<void> {
  await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
}

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

/** Scrive un documento come amministratore dell'emulatore (regole ignorate). */
async function put(path: string, data: Json): Promise<void> {
  const response = await fetch(`${BASE}/${path}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFields(data) }),
  });
  if (!response.ok) throw new Error(`seed fallito: ${response.status}`);
}

function bianco() {
  const v = validateNewMember({ lastName: 'BIANCO', firstName: 'LUCA', birthDate: '2019-05-10', sex: 'M', taxCode: '' }, 2026);
  if (!v.ok) throw new Error('dati di prova non validi');
  return v.member;
}

async function seedPerson(id: string, year: number): Promise<void> {
  await put(`persons/${id}`, { lastName: 'VERDI', firstName: 'PAOLO', birthDate: '1980-01-20', identityKey: 'VERDI|PAOLO|1980-01-20', createdInImport: `${year}-ADULTI` });
  await put(`adhesions/${year}_${id}`, { personId: id, associationYear: year, importId: `${year}-ADULTI`, sector: 'ADULTI' });
}

describe('FirestoreNewMemberBackend sugli emulatori', () => {
  const backend = new FirestoreNewMemberBackend();

  beforeEach(async () => {
    await signOut(auth);
    await clear();
    await put(`allowedEmails/${LISTED}`, {});
    await put('feeSchedules/2026', { ...scheduleToDocument(SCHEDULE_2026_27, 'seed@example.org'), updatedAt: new Date('2026-11-17T10:00:00Z') });
    await signInWithCredential(
      auth,
      GoogleAuthProvider.credential(JSON.stringify({ sub: 'sub-1', email: LISTED, email_verified: true, name: 'Utente Prova' })),
    );
  });

  afterAll(async () => {
    await signOut(auth);
  });

  it('E1 – persona nuova: persona manuale + adesione "nuovo"; E4 – anno con tesserati e annullamento', async () => {
    await backend.add({ year: 2026, list: 'ACR', member: bianco() }, 'Autorizzato@Example.org');
    const persons = (await getDocs(collection(db, 'persons'))).docs;
    expect(persons).toHaveLength(1);
    const person = persons[0]!;
    expect(person.data()).toMatchObject({
      lastName: 'BIANCO',
      firstName: 'LUCA',
      birthDate: '2019-05-10',
      sex: 'M',
      createdInYear: 2026,
      createdBy: LISTED,
    });
    const adhesion = await getDoc(doc(db, `adhesions/2026_${person.id}`));
    expect(adhesion.data()).toMatchObject({ origin: 'nuovo', list: 'ACR', sector: 'RAGAZZI', addedBy: LISTED });

    expect(await memberYears()).toEqual([2026]);
    const context = await backend.context(2026);
    expect(context.yearIds.has(person.id)).toBe(true);
    expect(context.schedule).toBeDefined();

    await new FirestoreRenewalsBackend().undo(2026, person.id);
    expect((await getDoc(doc(db, `adhesions/2026_${person.id}`))).exists()).toBe(false);
    expect((await getDoc(doc(db, `persons/${person.id}`))).exists()).toBe(true);
  });

  it('E2 – persona esistente (ultima adesione 2023): solo l’adesione', async () => {
    await seedPerson('verdi', 2023);
    const context = await backend.context(2026);
    expect(context.archive.find((p) => p.id === 'verdi')?.lastAdhesion?.year).toBe(2023);
    await backend.add({ year: 2026, list: 'ADULTI', personId: 'verdi' }, LISTED);
    expect((await getDocs(collection(db, 'persons'))).size).toBe(1);
    expect((await getDoc(doc(db, 'adhesions/2026_verdi'))).data()).toMatchObject({ origin: 'nuovo', list: 'ADULTI' });
  });

  it('E3 – seconda iscrizione nello stesso anno; adesione l’anno prima', async () => {
    await seedPerson('verdi', 2023);
    await backend.add({ year: 2026, list: 'ADULTI', personId: 'verdi' }, LISTED);
    await expect(backend.add({ year: 2026, list: 'ADULTI', personId: 'verdi' }, LISTED)).rejects.toBeInstanceOf(AlreadyEnrolledError);

    await seedPerson('neri', 2025);
    expect((await backend.context(2026)).previousYearIds.has('neri')).toBe(true);
    await expect(backend.add({ year: 2026, list: 'ADULTI', personId: 'neri' }, LISTED)).rejects.toBeInstanceOf(RenewableError);
  });
});
