/**
 * Integrazione del backend dell'import sugli emulatori Auth e Firestore (specifica 004).
 * Non fa parte di `npm test -w web`: si lancia con `npm run test:integration -w web`.
 * Solo righe inventate ed email `*@example.org`.
 */
import { GoogleAuthProvider, signInWithCredential, signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { SCHEDULE_2026_27 } from '@tesseramento/fees';
import { parseAdhesionSheet, planImport, type ImportPlan } from '@tesseramento/import';
import { auth, db } from '../core/firebase';
import { scheduleToDocument } from '../listini/schedule-mapper';
import { FirestoreScheduleUsage } from '../listini/schedule-usage';
import { AlreadyImportedError, NoFeeScheduleError } from './import-backend';
import { FirestoreImportBackend } from './firestore-import-backend';
import { fakeRow, sheetInput, type FakeRow } from './testing';

const PROJECT = 'demo-tesseramento';
const FIRESTORE = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const LISTED = 'autorizzato@example.org';

type Json = Record<string, unknown>;

function toValue(v: unknown): Json {
  if (typeof v === 'number') return { integerValue: String(v) };
  if (typeof v === 'string') return { stringValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  return { mapValue: { fields: toFields(v as Json) } };
}
function toFields(o: Json): Json {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, toValue(v)]));
}

/** "Bearer owner" aggira le regole sull'emulatore. */
async function put(path: string, fields: Json): Promise<void> {
  const response = await fetch(`${FIRESTORE}/${path}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFields(fields) }),
  });
  if (!response.ok) throw new Error(`seed fallito: ${response.status}`);
}

async function clear(): Promise<void> {
  await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
    method: 'DELETE',
  });
  await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
}

async function seedSchedule(year: number): Promise<void> {
  const label = `${year}/${String((year + 1) % 100).padStart(2, '0')}`;
  await put(`feeSchedules/${year}`, {
    ...scheduleToDocument({ ...SCHEDULE_2026_27, associationYear: year, label }, 'seed@example.org'),
    updatedAt: new Date('2026-11-17T10:00:00Z'),
  });
}

function planFor(rows: FakeRow[], existing = new Map<string, string>()): ImportPlan {
  const parsed = parseAdhesionSheet(sheetInput(rows));
  if (!parsed.ok) throw new Error('foglio di prova non valido');
  return planImport(parsed, existing);
}

const fifteen = () => Array.from({ length: 15 }, (_, i) => fakeRow(i + 1));

const ALLOWED_PERSON_FIELDS = ['lastName', 'firstName', 'birthDate', 'identityKey', 'createdInImport', 'sex', 'taxCode'];
const ALLOWED_ADHESION_FIELDS = ['personId', 'associationYear', 'importId', 'sector', 'exportAgeBand', 'bond', 'bondId'];

describe('FirestoreImportBackend sugli emulatori', () => {
  const backend = new FirestoreImportBackend();

  beforeEach(async () => {
    await signOut(auth);
    await clear();
    await put(`allowedEmails/${LISTED}`, {});
    await seedSchedule(2026);
    await signInWithCredential(
      auth,
      GoogleAuthProvider.credential(
        JSON.stringify({ sub: 'sub-1', email: LISTED, email_verified: true, name: 'Utente Prova' }),
      ),
    );
  });

  afterAll(async () => {
    await signOut(auth);
  });

  it('salva segno, 15 persone e 15 adesioni con i soli campi ammessi', async () => {
    expect(await backend.existingPersons()).toEqual(new Map());
    await backend.commit(planFor(fifteen()), 'Autorizzato@Example.org');

    const batch = await getDoc(doc(db, 'importBatches', '2026-ACR'));
    expect(batch.data()).toMatchObject({
      associationYear: 2026,
      source: 'ACR',
      importedBy: 'autorizzato@example.org',
      adhesionCount: 15,
      newPersonCount: 15,
      skippedRowCount: 0,
    });

    const persons = await getDocs(collection(db, 'persons'));
    const adhesions = await getDocs(collection(db, 'adhesions'));
    expect(persons.size).toBe(15);
    expect(adhesions.size).toBe(15);
    for (const p of persons.docs) {
      expect(Object.keys(p.data()).every((k) => ALLOWED_PERSON_FIELDS.includes(k))).toBe(true);
      expect(p.data()['createdInImport']).toBe('2026-ACR');
      expect(adhesions.docs.some((a) => a.id === `2026_${p.id}`)).toBe(true);
    }
    for (const a of adhesions.docs) {
      expect(Object.keys(a.data()).every((k) => ALLOWED_ADHESION_FIELDS.includes(k))).toBe(true);
      expect(a.data()).toMatchObject({ associationYear: 2026, importId: '2026-ACR', sector: 'RAGAZZI', bond: 'C3', bondId: '900002' });
    }

    const index = await backend.existingPersons();
    expect(index.size).toBe(15);
    expect(index.get('PROVA01|ALFA|2016-04-09')).toBeDefined();
  });

  it('anno successivo: riusa la persona già presente e aggiunge solo l’adesione', async () => {
    await backend.commit(planFor([fakeRow(1)]), LISTED);
    await seedSchedule(2027);
    const existing = await backend.existingPersons();
    await backend.commit(planFor([fakeRow(1, { 'Anno Associativo': 'Anno 2027' })], existing), LISTED);

    expect((await getDocs(collection(db, 'persons'))).size).toBe(1);
    const personId = existing.get('PROVA01|ALFA|2016-04-09');
    expect((await getDoc(doc(db, 'adhesions', `2027_${personId}`))).exists()).toBe(true);
    expect((await getDoc(doc(db, 'importBatches', '2027-ACR'))).data()?.['newPersonCount']).toBe(0);
  });

  it('dati facoltativi assenti non vengono scritti', async () => {
    await backend.commit(planFor([fakeRow(1, { Sesso: null, Legame: null, 'N. Legame': null })]), LISTED);
    const adhesion = (await getDocs(collection(db, 'adhesions'))).docs[0]!.data();
    expect(adhesion).not.toHaveProperty('bond');
    expect(adhesion).not.toHaveProperty('bondId');
    const person = (await getDocs(collection(db, 'persons'))).docs[0]!.data();
    expect(person).not.toHaveProperty('sex');
  });

  it('yearStatus e "anno con adesioni" dei listini seguono l’import dell’anno', async () => {
    const usage = new FirestoreScheduleUsage();
    expect(await backend.yearStatus(2026)).toEqual({ hasFeeSchedule: true, alreadyImported: false });
    expect(await backend.yearStatus(2030)).toEqual({ hasFeeSchedule: false, alreadyImported: false });
    expect(await usage.isInUse(2026)).toBe(false);
    await backend.commit(planFor([fakeRow(1)]), LISTED);
    expect(await backend.yearStatus(2026)).toEqual({ hasFeeSchedule: true, alreadyImported: true });
    expect(await usage.isInUse(2026)).toBe(true);
  });

  it('rifiuta un anno già importato e un anno senza listino, senza scrivere nulla', async () => {
    await backend.commit(planFor([fakeRow(1)]), LISTED);
    await expect(backend.commit(planFor([fakeRow(2)]), LISTED)).rejects.toBeInstanceOf(AlreadyImportedError);
    await expect(
      backend.commit(planFor([fakeRow(3, { 'Anno Associativo': 'Anno 2030' })]), LISTED),
    ).rejects.toBeInstanceOf(NoFeeScheduleError);
    expect((await getDocs(collection(db, 'persons'))).size).toBe(1);
    expect((await getDocs(collection(db, 'adhesions'))).size).toBe(1);
    expect((await getDocs(collection(db, 'importBatches'))).size).toBe(1);
  });
});
