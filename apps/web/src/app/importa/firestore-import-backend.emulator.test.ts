/**
 * Integrazione del backend dell'import sugli emulatori Auth e Firestore (specifica 004).
 * Non fa parte di `npm test -w web`: si lancia con `npm run test:integration -w web`.
 * Solo righe inventate ed email `*@example.org`.
 */
import { GoogleAuthProvider, signInWithCredential, signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { SCHEDULE_2026_27 } from '@tesseramento/fees';
import { parseAdhesionSheet, planImport, type AdhesionList, type ImportPlan } from '@tesseramento/import';
import { auth, db } from '../core/firebase';
import { scheduleToDocument } from '../listini/schedule-mapper';
import { FirestoreScheduleUsage } from '../listini/schedule-usage';
import { AlreadyImportedError, ImportContextChangedError } from './import-backend';
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

const backend = new FirestoreImportBackend();

/** Piano come lo fa l'app: contesto dell'anno letto dall'archivio, elenco riconosciuto. */
async function planFor(rows: FakeRow[]): Promise<ImportPlan> {
  const parsed = parseAdhesionSheet(sheetInput(rows));
  if (!parsed.ok || parsed.recognition.kind !== 'recognized') throw new Error('foglio di prova non valido');
  const context = await backend.yearContext(parsed.associationYear);
  return planImport(parsed, parsed.recognition.list, context.archive, context.adhesions);
}

const SECTOR: Record<AdhesionList, FakeRow> = {
  ACR: { Settore: 'RAGAZZI' },
  GIOVANI: { Settore: 'GIOVANI', "Fasce d'età": '19/25', 'Data Nascita': '01/01/2001' },
  ADULTI: { Settore: 'ADULTI', "Fasce d'età": 'AD', 'Data Nascita': '01/01/1970' },
};
const rowOf = (list: AdhesionList, n: number, over: FakeRow = {}) =>
  fakeRow(n, { ...SECTOR[list], Cognome: `${list}${String(n).padStart(2, '0')}`, ...over });
const rowsOf = (list: AdhesionList, count: number) => Array.from({ length: count }, (_, i) => rowOf(list, i + 1));

const ALLOWED_PERSON_FIELDS = ['lastName', 'firstName', 'birthDate', 'identityKey', 'createdInImport', 'sex', 'taxCode'];
const ALLOWED_ADHESION_FIELDS = ['personId', 'associationYear', 'importId', 'sector', 'exportAgeBand', 'bond', 'bondId'];

const size = async (name: string) => (await getDocs(collection(db, name))).size;

describe('FirestoreImportBackend sugli emulatori', () => {
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

  it('salva segno, 15 persone e 15 adesioni ACR con i soli campi ammessi', async () => {
    await backend.commit(await planFor(rowsOf('ACR', 15)), 'Autorizzato@Example.org');

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
      expect(adhesions.docs.some((a) => a.id === `2026_${p.id}`)).toBe(true);
    }
    for (const a of adhesions.docs) {
      expect(Object.keys(a.data()).every((k) => ALLOWED_ADHESION_FIELDS.includes(k))).toBe(true);
      expect(a.data()).toMatchObject({ associationYear: 2026, importId: '2026-ACR', sector: 'RAGAZZI' });
    }
  });

  it('ACR, Giovani e Adulti del 2026: tre segni e contesto dell’anno completo (005)', async () => {
    await backend.commit(await planFor(rowsOf('ACR', 3)), LISTED);
    await backend.commit(await planFor(rowsOf('GIOVANI', 2)), LISTED);
    await backend.commit(await planFor(rowsOf('ADULTI', 4)), LISTED);

    const context = await backend.yearContext(2026);
    expect(context.hasFeeSchedule).toBe(true);
    expect([...context.importedLists].sort()).toEqual(['ACR', 'ADULTI', 'GIOVANI']);
    expect(context.archive).toHaveLength(9);
    expect([...context.adhesions.values()].sort()).toEqual([
      'ACR', 'ACR', 'ACR', 'ADULTI', 'ADULTI', 'ADULTI', 'ADULTI', 'GIOVANI', 'GIOVANI',
    ]);
    expect((await getDoc(doc(db, 'importBatches', '2026-GIOVANI'))).data()?.['source']).toBe('GIOVANI');
  });

  it('secondo import Giovani: AlreadyImportedError con l’elenco, nulla scritto', async () => {
    await backend.commit(await planFor(rowsOf('GIOVANI', 1)), LISTED);
    const again = await planFor([rowOf('GIOVANI', 2)]);
    await expect(backend.commit(again, LISTED)).rejects.toBeInstanceOf(AlreadyImportedError);
    await expect(backend.commit(again, LISTED)).rejects.toMatchObject({ list: 'GIOVANI' });
    expect(await size('persons')).toBe(1);
  });

  it('persona ACR anche nell’elenco Adulti: riga saltata, salvate solo le altre (005, US2)', async () => {
    await backend.commit(await planFor([rowOf('ACR', 1)]), LISTED);
    const plan = await planFor([rowOf('ADULTI', 1), rowOf('ACR', 1, { Settore: 'ADULTI' }), rowOf('ADULTI', 2)]);
    expect(plan.skipped).toEqual([{ rowNumber: 3, reason: 'alreadyInYear', fromList: 'ACR', lastName: 'ACR01', firstName: 'ALFA' }]);
    await backend.commit(plan, LISTED);
    expect(await size('persons')).toBe(3);
    expect(await size('adhesions')).toBe(3);
  });

  it('persona riusata che riceve un’adesione dell’anno dopo l’anteprima: ImportContextChangedError', async () => {
    await seedSchedule(2025);
    await backend.commit(await planFor([rowOf('ADULTI', 1, { 'Anno Associativo': 'Anno 2026' })]), LISTED);
    const adultsPlan = await planFor([rowOf('ADULTI', 1)]);
    expect(adultsPlan.reusedPersons).toHaveLength(1);
    // Nel frattempo la stessa persona viene importata nell'elenco Giovani del 2026.
    await backend.commit(await planFor([rowOf('ADULTI', 1, { Settore: 'GIOVANI' })]), LISTED);
    await expect(backend.commit(adultsPlan, LISTED)).rejects.toBeInstanceOf(ImportContextChangedError);
    expect(await size('importBatches')).toBe(2);
    expect(await size('adhesions')).toBe(2);
  });

  it('anno successivo: riusa la persona e aggiunge solo l’adesione', async () => {
    await backend.commit(await planFor([rowOf('ACR', 1)]), LISTED);
    await seedSchedule(2027);
    await backend.commit(await planFor([rowOf('ACR', 1, { 'Anno Associativo': 'Anno 2028' })]), LISTED);
    expect(await size('persons')).toBe(1);
    expect((await getDoc(doc(db, 'importBatches', '2027-ACR'))).data()?.['newPersonCount']).toBe(0);
  });

  it('dati facoltativi assenti non vengono scritti', async () => {
    await backend.commit(await planFor([rowOf('ACR', 1, { Sesso: null, Legame: null, 'N. Legame': null })]), LISTED);
    const adhesion = (await getDocs(collection(db, 'adhesions'))).docs[0]!.data();
    expect(adhesion).not.toHaveProperty('bond');
    expect(adhesion).not.toHaveProperty('bondId');
    expect((await getDocs(collection(db, 'persons'))).docs[0]!.data()).not.toHaveProperty('sex');
  });

  it('anno senza listino ("Anno 2026" = 2025/26): si importa (008)', async () => {
    const plan = await planFor([rowOf('ACR', 1, { 'Anno Associativo': 'Anno 2026' })]);
    expect(plan.associationYear).toBe(2025);
    expect((await backend.yearContext(2025)).hasFeeSchedule).toBe(false);
    await backend.commit(plan, LISTED);
    expect((await getDoc(doc(db, 'importBatches', '2025-ACR'))).exists()).toBe(true);
  });

  it('"anno con adesioni" dei listini vale per qualsiasi elenco (005, FR-011)', async () => {
    const usage = new FirestoreScheduleUsage();
    expect(await usage.isInUse(2026)).toBe(false);
    await backend.commit(await planFor([rowOf('ADULTI', 1)]), LISTED);
    expect(await usage.isInUse(2026)).toBe(true);
  });

  it('archivio con l’ultima adesione di ogni persona e listino dell’anno (006)', async () => {
    await seedSchedule(2025);
    await backend.commit(await planFor([rowOf('ADULTI', 1, { 'Anno Associativo': 'Anno 2026' })]), LISTED);
    await backend.commit(await planFor([rowOf('ADULTI', 1)]), LISTED);
    const context = await backend.yearContext(2026);
    expect(context.feeSchedule?.associationYear).toBe(2026);
    expect(context.archive).toHaveLength(1);
    expect(context.archive[0]).toMatchObject({ lastName: 'ADULTI01', firstName: 'ALFA', lastAdhesion: { year: 2026, list: 'ADULTI' } });
  });

  it('possibile doppione deciso "Stessa persona": nessuna persona nuova, anagrafica invariata (006)', async () => {
    await seedSchedule(2025);
    await backend.commit(await planFor([rowOf('ADULTI', 1, { 'Anno Associativo': 'Anno 2026', Nome: 'MARIA' })]), LISTED);
    const parsed = parseAdhesionSheet(sheetInput([rowOf('ADULTI', 1, { Nome: 'MARIA GRAZIA' })]));
    if (!parsed.ok) throw new Error('foglio di prova non valido');
    const context = await backend.yearContext(2026);
    const pending = planImport(parsed, 'ADULTI', context.archive, context.adhesions);
    expect(pending.pendingDuplicates).toBe(1);
    const id = pending.duplicates[0]!.candidates[0]!.id;
    const plan = planImport(parsed, 'ADULTI', context.archive, context.adhesions, new Map([[2, id]]));
    await backend.commit(plan, LISTED);
    expect(await size('persons')).toBe(1);
    expect((await getDoc(doc(db, 'adhesions', `2026_${id}`))).exists()).toBe(true);
    expect((await getDoc(doc(db, 'persons', id))).data()?.['firstName']).toBe('MARIA');
  });
});
