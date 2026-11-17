import { collection, doc, getDocs, query, runTransaction, serverTimestamp, where, type Timestamp } from 'firebase/firestore';
import type { FeeLine, NotCoveredKind, SavedHouseholdFee } from '@tesseramento/families';
import { db } from '../core/firebase';
import type { HouseholdFeeEntry, HouseholdFeesBackend } from './fees-backend';

const feeId = (year: number, key: string) => `${year}_${key}`;

/** Toglie i campi assenti: Firestore rifiuta `undefined` e le regole ammettono solo i campi previsti. */
function defined<T extends Record<string, unknown>>(fields: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
}

/** Quote dei nuclei in Cloud Firestore (specifica 010, contracts/firestore-fees.md). Nessun nome salvato né nei log. */
export class FirestoreHouseholdFeesBackend implements HouseholdFeesBackend {
  async saved(year: number): Promise<SavedHouseholdFee[]> {
    const snapshot = await getDocs(query(collection(db, 'householdFees'), where('associationYear', '==', year)));
    return snapshot.docs.map((d) => {
      const data = d.data();
      return {
        key: String(data['householdKey']),
        associationYear: Number(data['associationYear']),
        memberIds: (data['memberIds'] as unknown[]).map(String),
        kind: data['kind'] === 'manual' ? 'manual' : 'calculated',
        ...(Array.isArray(data['lines']) ? { lines: data['lines'] as FeeLine[] } : {}),
        ...(typeof data['acrPackageCents'] === 'number' ? { acrPackageCents: data['acrPackageCents'] } : {}),
        ...(typeof data['manualCents'] === 'number' ? { manualCents: data['manualCents'] } : {}),
        ...(typeof data['note'] === 'string' ? { note: data['note'] } : {}),
        ...(typeof data['reason'] === 'string' ? { reason: data['reason'] as NotCoveredKind } : {}),
        totalCents: Number(data['totalCents']),
        savedAt: (data['savedAt'] as Timestamp | null)?.toDate() ?? new Date(0),
        savedBy: String(data['savedBy']),
      };
    });
  }

  /** Una sola transazione di scritture (research R5): tutto o niente, fallisce senza connessione. */
  async save(entries: readonly HouseholdFeeEntry[], removedKeys: readonly string[], year: number, email: string): Promise<void> {
    await runTransaction(db, async (tx) => {
      for (const e of entries) {
        tx.set(
          doc(db, 'householdFees', feeId(e.associationYear, e.key)),
          defined({
            associationYear: e.associationYear,
            householdKey: e.key,
            memberIds: [...e.memberIds],
            kind: e.kind,
            lines: e.lines?.map((l) => defined({ ...l })),
            acrPackageCents: e.acrPackageCents,
            manualCents: e.manualCents,
            note: e.note,
            reason: e.reason,
            totalCents: e.totalCents,
            savedAt: serverTimestamp(),
            savedBy: email.trim().toLowerCase(),
          }),
        );
      }
      for (const key of removedKeys) tx.delete(doc(db, 'householdFees', feeId(year, key)));
    });
  }
}
