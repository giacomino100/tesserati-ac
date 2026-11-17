/**
 * Integrazione del backend delle riconferme sugli emulatori (specifica 008, E1–E4).
 * Non fa parte di `npm test -w web`: si lancia con `npm run test:integration -w web`.
 * Solo ID inventati ed email `*@example.org`.
 */
import { GoogleAuthProvider, signInWithCredential, signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import type { RenewalDraft } from '@tesseramento/families';
import { auth, db } from '../core/firebase';
import { memberYears } from '../core/member-years';
import { FirestoreRenewalsBackend } from './firestore-renewals-backend';
import { AlreadyRenewedError, RenewalInFamilyError } from './renewals-backend';

const PROJECT = 'demo-tesseramento';
const LISTED = 'autorizzato@example.org';
const BASE = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;

async function clear(): Promise<void> {
  await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
}

type Plain = string | number | boolean | Plain[] | { [k: string]: Plain };

function field(value: Plain): Record<string, unknown> {
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(field) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, field(v)])) } };
}

/** Scrive un documento come amministratore dell'emulatore (regole ignorate). */
async function put(path: string, data: Record<string, Plain>): Promise<void> {
  const response = await fetch(`${BASE}/${path}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, field(v)])) }),
  });
  if (!response.ok) throw new Error(`seed fallito: ${response.status}`);
}

/** Listino minimo: le regole delle riconferme controllano solo che esista. */
const schedule = (year: number) => put(`feeSchedules/${year}`, { associationYear: year });

/** n persone con adesione 2026 importata (ID p0…). */
async function seed2026(n: number): Promise<string[]> {
  const ids = Array.from({ length: n }, (_, i) => `p${i}`);
  for (const id of ids) {
    await put(`persons/${id}`, { lastName: `PROVA${id}`, firstName: 'ALFA', birthDate: '1980-01-01', identityKey: `K${id}`, createdInImport: '2026-ADULTI' });
    await put(`adhesions/2026_${id}`, { personId: id, associationYear: 2026, importId: '2026-ADULTI', sector: 'ADULTI', bond: 'C2', bondId: '900001' });
  }
  return ids;
}

const draft = (personId: string): RenewalDraft => ({ personId, associationYear: 2027, list: 'ADULTI', bond: 'C2', bondId: '900001' });

const renewedIn2027 = async () =>
  (await getDocs(query(collection(db, 'adhesions'), where('associationYear', '==', 2027)))).docs.map((d) => d.data());

describe('FirestoreRenewalsBackend sugli emulatori', () => {
  const backend = new FirestoreRenewalsBackend();

  beforeEach(async () => {
    await signOut(auth);
    await clear();
    await put(`allowedEmails/${LISTED}`, {});
    await schedule(2026);
    await schedule(2027);
    await signInWithCredential(
      auth,
      GoogleAuthProvider.credential(JSON.stringify({ sub: 'sub-1', email: LISTED, email_verified: true, name: 'Utente Prova' })),
    );
  });

  afterAll(async () => {
    await signOut(auth);
  });

  it('E1 – riconferma 37 persone a gruppi di 15 con i campi attesi; E4 – l’anno compare tra quelli con tesserati', async () => {
    const ids = await seed2026(37);
    await backend.renew(ids.map(draft), 'Autorizzato@Example.org');
    const docs = await renewedIn2027();
    expect(docs).toHaveLength(37);
    expect(docs[0]).toMatchObject({
      associationYear: 2027,
      origin: 'riconferma',
      list: 'ADULTI',
      sector: 'ADULTI',
      bond: 'C2',
      bondId: '900001',
      renewedFrom: 2026,
      renewedBy: LISTED,
    });
    expect(Object.keys(docs[0]!)).not.toContain('importId');
    expect(await memberYears()).toContain(2027);
    const members = await backend.yearMembers(2027);
    expect(members).toHaveLength(37);
    expect(members.every((m) => m.origin === 'riconferma' && m.list === 'ADULTI')).toBe(true);
    expect((await backend.renewals(2027)).get('p0')?.renewedBy).toBe(LISTED);
  });

  it('E2 – persona già iscritta: AlreadyRenewedError e nulla salvato del gruppo', async () => {
    const ids = await seed2026(3);
    await backend.renew([draft('p1')], LISTED);
    await expect(backend.renew(ids.map(draft), LISTED)).rejects.toBeInstanceOf(AlreadyRenewedError);
    expect(await renewedIn2027()).toHaveLength(1);
  });

  it('E3 – annulla una riconferma; con una famiglia dell’anno resta; quota salvata visibile', async () => {
    await seed2026(2);
    await backend.renew([draft('p0'), draft('p1')], LISTED);
    await put('householdFees/2027_p-p0', { associationYear: 2027 });
    expect(await backend.hasSavedFee(2027, 'p0')).toBe(true);
    expect(await backend.hasSavedFee(2027, 'p1')).toBe(false);

    await backend.undo(2027, 'p0');
    expect((await getDoc(doc(db, 'adhesions/2027_p0'))).exists()).toBe(false);

    await put('familyMemberships/2027_p1', { associationYear: 2027, personId: 'p1', familyId: 'F' });
    await expect(backend.undo(2027, 'p1')).rejects.toBeInstanceOf(RenewalInFamilyError);
    expect((await getDoc(doc(db, 'adhesions/2027_p1'))).exists()).toBe(true);
  });
});
