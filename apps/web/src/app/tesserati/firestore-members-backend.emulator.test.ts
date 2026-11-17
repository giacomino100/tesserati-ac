/**
 * Integrazione della lettura dei tesserati sugli emulatori (specifica 004, FR-019).
 * Non fa parte di `npm test -w web`: si lancia con `npm run test:integration -w web`.
 * Solo nomi inventati ed email `*@example.org`.
 */
import { GoogleAuthProvider, signInWithCredential, signOut } from 'firebase/auth';
import { auth } from '../core/firebase';
import { FirestoreMembersBackend } from './firestore-members-backend';

const PROJECT = 'demo-tesseramento';
const FIRESTORE = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const LISTED = 'autorizzato@example.org';

type Json = Record<string, unknown>;

function toValue(v: unknown): Json {
  if (typeof v === 'number') return { integerValue: String(v) };
  if (typeof v === 'string') return { stringValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  return { mapValue: { fields: toFields(v as Json) } };
}
function toFields(o: Json): Json {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, toValue(v)]));
}

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

describe('FirestoreMembersBackend sugli emulatori', () => {
  const backend = new FirestoreMembersBackend();

  beforeEach(async () => {
    await signOut(auth);
    await clear();
    await put(`allowedEmails/${LISTED}`, {});
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

  it('senza import: nessun anno e nessun tesserato', async () => {
    expect(await backend.importedYears()).toEqual([]);
    expect(await backend.membersOfYear(2026)).toEqual([]);
  });

  it('tre elenchi dello stesso anno: l’anno compare una volta sola (005)', async () => {
    const batch = { importedAt: new Date(), importedBy: LISTED, adhesionCount: 1, newPersonCount: 1, skippedRowCount: 0 };
    for (const source of ['ACR', 'GIOVANI', 'ADULTI']) {
      await put(`importBatches/2026-${source}`, { ...batch, associationYear: 2026, source });
    }
    expect(await backend.importedYears()).toEqual([2026]);
  });

  it('unisce adesioni dell’anno e persone, senza altri anni', async () => {
    const batch = { source: 'ACR', importedAt: new Date(), importedBy: LISTED, adhesionCount: 1, newPersonCount: 1, skippedRowCount: 0 };
    await put('importBatches/2026-ACR', { ...batch, associationYear: 2026 });
    await put('importBatches/2027-ACR', { ...batch, associationYear: 2027 });
    await put('persons/a', {
      lastName: 'PROVA', firstName: 'ALFA', birthDate: '2016-04-09', identityKey: 'PROVA|ALFA|2016-04-09',
      sex: 'F', createdInImport: '2026-ACR',
    });
    await put('persons/b', {
      lastName: 'PROVA', firstName: 'BETA', birthDate: '2015-01-01', identityKey: 'PROVA|BETA|2015-01-01',
      createdInImport: '2027-ACR',
    });
    await put('adhesions/2026_a', {
      personId: 'a', associationYear: 2026, importId: '2026-ACR', sector: 'RAGAZZI', exportAgeBand: '9/11', bond: 'C3', bondId: '900002',
    });
    await put('adhesions/2027_b', { personId: 'b', associationYear: 2027, importId: '2027-ACR', sector: 'RAGAZZI' });

    expect((await backend.importedYears()).sort()).toEqual([2026, 2027]);
    expect(await backend.membersOfYear(2026)).toEqual([
      { lastName: 'PROVA', firstName: 'ALFA', birthDate: '2016-04-09', sector: 'RAGAZZI', exportAgeBand: '9/11', bond: 'C3', bondId: '900002' },
    ]);
    expect(await backend.membersOfYear(2027)).toEqual([
      { lastName: 'PROVA', firstName: 'BETA', birthDate: '2015-01-01', sector: 'RAGAZZI' },
    ]);
  });
});
