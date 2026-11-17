/**
 * Integrazione del backend delle famiglie sugli emulatori (specifica 007).
 * Non fa parte di `npm test -w web`: si lancia con `npm run test:integration -w web`.
 * Solo nomi inventati ed email `*@example.org`.
 */
import { GoogleAuthProvider, signInWithCredential, signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { auth, db } from '../core/firebase';
import { MemberInOtherFamilyError } from './families-backend';
import { FirestoreFamiliesBackend } from './firestore-families-backend';

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
  await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
}

/** Persona inventata con l'adesione di un anno. */
async function seedMember(id: string, year: number, over: Json = {}, list = 'ADULTI') {
  await put(`persons/${id}`, {
    lastName: id.toUpperCase(), firstName: 'ALFA', birthDate: '1980-01-20', identityKey: `${id.toUpperCase()}|ALFA|1980-01-20`, createdInImport: `${year}-${list}`,
  });
  await put(`adhesions/${year}_${id}`, { personId: id, associationYear: year, importId: `${year}-${list}`, sector: 'ADULTI', ...over });
}

const size = async (name: string) => (await getDocs(collection(db, name))).size;

describe('FirestoreFamiliesBackend sugli emulatori', () => {
  const backend = new FirestoreFamiliesBackend();

  beforeEach(async () => {
    await signOut(auth);
    await clear();
    await put(`allowedEmails/${LISTED}`, {});
    await put('importBatches/2026-ADULTI', { associationYear: 2026, source: 'ADULTI', importedAt: new Date(), importedBy: LISTED, adhesionCount: 4, newPersonCount: 4, skippedRowCount: 0 });
    await seedMember('a', 2026, { bond: 'C3', bondId: '900002' });
    await seedMember('b', 2026, { bond: 'C3', bondId: '900002' });
    await seedMember('c', 2026, { bond: 'C3', bondId: '900002' }, 'ACR');
    await seedMember('d', 2026);
    await seedMember('e', 2027);
    await signInWithCredential(
      auth,
      GoogleAuthProvider.credential(JSON.stringify({ sub: 'sub-1', email: LISTED, email_verified: true, name: 'Utente Prova' })),
    );
  });

  afterAll(async () => {
    await signOut(auth);
  });

  it('tesserati dell’anno con elenco e legame, anni importati, nessuna famiglia', async () => {
    const members = await backend.yearMembers(2026);
    expect(members.map((m) => m.personId).sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(members.find((m) => m.personId === 'c')).toMatchObject({ list: 'ACR', bond: 'C3', bondId: '900002', lastName: 'C' });
    expect(members.find((m) => m.personId === 'd')).not.toHaveProperty('bondId');
    expect(await backend.importedYears()).toEqual([2026]);
    expect(await backend.confirmedFamilies(2026)).toEqual([]);
  });

  it('conferma: famiglie e appartenenze; nulla negli altri anni; persone e adesioni intatte', async () => {
    await backend.confirm([{ associationYear: 2026, memberIds: ['a', 'b', 'c'], origin: 'legame', bondId: '900002' }], 'Autorizzato@Example.org');
    const [family] = await backend.confirmedFamilies(2026);
    expect(family).toMatchObject({ memberIds: ['a', 'b', 'c'], origin: 'legame', bondId: '900002', confirmedBy: 'autorizzato@example.org' });
    expect(Math.abs(Date.now() - family!.confirmedAt.getTime())).toBeLessThan(60_000);
    expect(await backend.memberships(2026)).toEqual(new Map([['a', family!.id], ['b', family!.id], ['c', family!.id]]));
    expect(await backend.confirmedFamilies(2027)).toEqual([]);
    expect((await getDoc(doc(db, 'adhesions', '2026_a'))).data()).not.toHaveProperty('familyId');
    expect(await size('persons')).toBe(5);
  });

  it('correzione: togliere un componente cancella la sua appartenenza', async () => {
    await backend.confirm([{ associationYear: 2026, memberIds: ['a', 'b', 'c'], origin: 'legame', bondId: '900002' }], LISTED);
    const [family] = await backend.confirmedFamilies(2026);
    await backend.confirm([{ id: family!.id, associationYear: 2026, memberIds: ['a', 'b'], origin: 'legame', bondId: '900002' }], LISTED);
    expect((await backend.confirmedFamilies(2026))[0]?.memberIds).toEqual(['a', 'b']);
    expect([...(await backend.memberships(2026)).keys()].sort()).toEqual(['a', 'b']);
  });

  it('persona già in un’altra famiglia: errore, nulla scritto', async () => {
    await backend.confirm([{ associationYear: 2026, memberIds: ['a', 'b'], origin: 'legame', bondId: '900002' }], LISTED);
    await expect(
      backend.confirm([{ associationYear: 2026, memberIds: ['b', 'd'], origin: 'manuale' }], LISTED),
    ).rejects.toBeInstanceOf(MemberInOtherFamilyError);
    expect(await size('families')).toBe(1);
    expect(await size('familyMemberships')).toBe(2);
  });

  it('scioglimento: famiglia e appartenenze cancellate', async () => {
    await backend.confirm([{ associationYear: 2026, memberIds: ['a', 'd'], origin: 'manuale' }], LISTED);
    const [family] = await backend.confirmedFamilies(2026);
    await backend.dissolve(family!.id);
    expect(await size('families')).toBe(0);
    expect(await size('familyMemberships')).toBe(0);
  });

  it('un gruppo di 8 famiglie in una sola transazione (limite delle regole)', async () => {
    for (let i = 0; i < 16; i++) await seedMember(`g${i}`, 2026);
    const drafts = Array.from({ length: 8 }, (_, i) => ({
      associationYear: 2026,
      memberIds: [`g${2 * i}`, `g${2 * i + 1}`],
      origin: 'manuale' as const,
    }));
    await backend.confirm(drafts, LISTED);
    expect(await size('families')).toBe(8);
    expect(await size('familyMemberships')).toBe(16);
  });
});
