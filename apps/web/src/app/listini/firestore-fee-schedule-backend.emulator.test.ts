/**
 * Integrazione del backend dei listini sugli emulatori Auth e Firestore (specifica 003).
 * Non fa parte di `npm test -w web`: si lancia con `npm run test:integration -w web`.
 * Solo email finte `*@example.org` e le quote del PDF.
 */
import { GoogleAuthProvider, signInWithCredential, signOut } from 'firebase/auth';
import { copyForNextYear, SCHEDULE_2026_27 } from '@tesseramento/fees';
import { auth } from '../core/firebase';
import { ScheduleConflictError } from './fee-schedule-backend';
import { FirestoreFeeScheduleBackend } from './firestore-fee-schedule-backend';
import { scheduleToDocument } from './schedule-mapper';

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

/** "Bearer owner" aggira le regole sull'emulatore: è l'equivalente dello script di seed. */
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

describe('FirestoreFeeScheduleBackend sugli emulatori', () => {
  const backend = new FirestoreFeeScheduleBackend();

  beforeEach(async () => {
    await signOut(auth);
    await clear();
    await put(`allowedEmails/${LISTED}`, {});
    await put('feeSchedules/2026', {
      ...scheduleToDocument(SCHEDULE_2026_27, 'seed@example.org'),
      updatedAt: new Date('2026-11-17T10:00:00Z'),
    });
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

  it('legge elenco e dettaglio con le quote del PDF e l’ultima modifica', async () => {
    const all = await backend.list();
    expect(all).toHaveLength(1);
    const one = await backend.get(2026);
    expect(one?.schedule).toEqual(SCHEDULE_2026_27);
    expect(one?.updatedBy).toBe('seed@example.org');
    expect(one?.updatedAt).toEqual(new Date('2026-11-17T10:00:00Z'));
    expect(await backend.get(2030)).toBeUndefined();
  });

  it('crea il 2027 con data ed email di chi salva, e il 2026 resta uguale', async () => {
    await backend.create(copyForNextYear(SCHEDULE_2026_27), 'Autorizzato@Example.org');
    const created = await backend.get(2027);
    expect(created?.schedule).toEqual(copyForNextYear(SCHEDULE_2026_27));
    expect(created?.updatedBy).toBe('autorizzato@example.org');
    expect(Math.abs(Date.now() - (created?.updatedAt.getTime() ?? 0))).toBeLessThan(60_000);
    expect((await backend.get(2026))?.schedule).toEqual(SCHEDULE_2026_27);
  });

  it('rifiuta di creare un anno saltato e un anno già esistente', async () => {
    const skipped = { ...copyForNextYear(copyForNextYear(SCHEDULE_2026_27)) };
    await expect(backend.create(skipped, LISTED)).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(backend.create({ ...SCHEDULE_2026_27 }, LISTED)).rejects.toMatchObject({ code: 'already-exists' });
    expect(await backend.get(2028)).toBeUndefined();
  });

  it('modifica le quote, rileva il conflitto e sovrascrive solo su scelta esplicita', async () => {
    const opened = (await backend.get(2026))!;
    const changed = {
      ...SCHEDULE_2026_27,
      acrPackageCents: 2600,
    };
    await backend.update(changed, LISTED, opened.updatedAt, false);
    const after = (await backend.get(2026))!;
    expect(after.schedule.acrPackageCents).toBe(2600);
    expect(after.updatedBy).toBe(LISTED);

    // Un'altra persona ha salvato dopo l'apertura: `opened.updatedAt` è ormai vecchio.
    const other = { ...SCHEDULE_2026_27, acrPackageCents: 2700 };
    await expect(backend.update(other, LISTED, opened.updatedAt, false)).rejects.toBeInstanceOf(
      ScheduleConflictError,
    );
    expect((await backend.get(2026))?.schedule.acrPackageCents).toBe(2600);

    await backend.update(other, LISTED, opened.updatedAt, true);
    expect((await backend.get(2026))?.schedule.acrPackageCents).toBe(2700);
  });

  it('le regole negano la modifica delle regole fisse', async () => {
    const opened = (await backend.get(2026))!;
    const broken = { ...SCHEDULE_2026_27, minAge: 5 };
    await expect(backend.update(broken, LISTED, opened.updatedAt, true)).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });
});
