/**
 * Integrazione del backend delle quote sugli emulatori (specifica 010).
 * Non fa parte di `npm test -w web`: si lancia con `npm run test:integration -w web`.
 * Solo ID inventati ed email `*@example.org`.
 */
import { GoogleAuthProvider, signInWithCredential, signOut } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../core/firebase';
import type { HouseholdFeeEntry } from './fees-backend';
import { FirestoreHouseholdFeesBackend } from './firestore-fees-backend';

const PROJECT = 'demo-tesseramento';
const LISTED = 'autorizzato@example.org';

async function clear(): Promise<void> {
  await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
}

async function allow(): Promise<void> {
  const response = await fetch(
    `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents/allowedEmails/${LISTED}`,
    { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: {} }) },
  );
  if (!response.ok) throw new Error(`seed fallito: ${response.status}`);
}

const calculated = (key: string, totalCents = 5200): HouseholdFeeEntry => ({
  key,
  associationYear: 2026,
  memberIds: ['a', 'b'],
  kind: 'calculated',
  lines: [
    { memberId: 'a', age: 46, band: 'adulti', fullCents: 2600, benefit: 'none', amountCents: 2600 },
    { memberId: 'b', age: 10, band: 'acr', fullCents: 1500, benefit: 'inAcrPackage' },
  ],
  totalCents,
});

const manual: HouseholdFeeEntry = {
  key: 'p-gatti',
  associationYear: 2026,
  memberIds: ['g'],
  kind: 'manual',
  manualCents: 0,
  note: 'Esente per decisione del consiglio',
  reason: 'memberUnderMinAge',
  totalCents: 0,
};

const size = async () => (await getDocs(collection(db, 'householdFees'))).size;

describe('FirestoreHouseholdFeesBackend sugli emulatori', () => {
  const backend = new FirestoreHouseholdFeesBackend();

  beforeEach(async () => {
    await signOut(auth);
    await clear();
    await allow();
    await signInWithCredential(
      auth,
      GoogleAuthProvider.credential(JSON.stringify({ sub: 'sub-1', email: LISTED, email_verified: true, name: 'Utente Prova' })),
    );
  });

  afterAll(async () => {
    await signOut(auth);
  });

  it('salva e rilegge quote calcolate e manuali, solo per l’anno', async () => {
    await backend.save([calculated('f-a'), manual], [], 2026, 'Autorizzato@Example.org');
    const saved = await backend.saved(2026);
    expect(saved).toHaveLength(2);
    const fee = saved.find((s) => s.key === 'f-a')!;
    expect(fee).toMatchObject({ kind: 'calculated', memberIds: ['a', 'b'], totalCents: 5200, savedBy: 'autorizzato@example.org' });
    expect(fee.lines?.[1]).toEqual({ memberId: 'b', age: 10, band: 'acr', fullCents: 1500, benefit: 'inAcrPackage' });
    expect(Math.abs(Date.now() - fee.savedAt.getTime())).toBeLessThan(60_000);
    expect(saved.find((s) => s.key === 'p-gatti')).toMatchObject({ kind: 'manual', manualCents: 0, note: 'Esente per decisione del consiglio', reason: 'memberUnderMinAge' });
    expect(await backend.saved(2027)).toEqual([]);
  });

  it('aggiorna e cancella nella stessa transazione', async () => {
    await backend.save([calculated('f-a'), calculated('f-b')], [], 2026, LISTED);
    await backend.save([calculated('f-a', 5400)], ['f-b'], 2026, LISTED);
    const saved = await backend.saved(2026);
    expect(saved.map((s) => [s.key, s.totalCents])).toEqual([['f-a', 5400]]);
  });

  it('120 quote in una sola transazione', async () => {
    await backend.save(Array.from({ length: 120 }, (_, i) => calculated(`p-${i}`)), [], 2026, LISTED);
    expect(await size()).toBe(120);
  });
});
