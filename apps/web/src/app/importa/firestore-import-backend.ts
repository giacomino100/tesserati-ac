import { collection, doc, getDoc, getDocs, runTransaction, serverTimestamp } from 'firebase/firestore';
import type { ImportPlan, ImportRow } from '@tesseramento/import';
import { db } from '../core/firebase';
import { AlreadyImportedError, NoFeeScheduleError, type ImportBackend, type YearStatus } from './import-backend';

/** Toglie i campi assenti: Firestore rifiuta `undefined` e le regole ammettono solo campi presenti. */
function defined(fields: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
}

function personDocument(row: ImportRow, importId: string): Record<string, unknown> {
  return defined({
    lastName: row.lastName,
    firstName: row.firstName,
    birthDate: row.birthDate,
    identityKey: row.identityKey,
    createdInImport: importId,
    sex: row.sex,
    taxCode: row.taxCode,
  });
}

function adhesionDocument(row: ImportRow, personId: string, plan: ImportPlan): Record<string, unknown> {
  return defined({
    personId,
    associationYear: plan.associationYear,
    importId: plan.importId,
    sector: row.sector,
    exportAgeBand: row.exportAgeBand,
    bond: row.bond,
    bondId: row.bondId,
  });
}

/** Import in Cloud Firestore (contracts/firestore-import.md). Nessun dato delle righe nei log. */
export class FirestoreImportBackend implements ImportBackend {
  async yearStatus(year: number): Promise<YearStatus> {
    const [schedule, batch] = await Promise.all([
      getDoc(doc(db, 'feeSchedules', String(year))),
      getDoc(doc(db, 'importBatches', `${year}-ACR`)),
    ]);
    return { hasFeeSchedule: schedule.exists(), alreadyImported: batch.exists() };
  }

  async existingPersons(): Promise<Map<string, string>> {
    const snapshot = await getDocs(collection(db, 'persons'));
    const index = new Map<string, string>();
    for (const person of snapshot.docs) {
      const key = person.data()['identityKey'];
      if (typeof key === 'string') index.set(key, person.id);
    }
    return index;
  }

  /**
   * Una sola transazione (research R8): rilegge segno e listino, poi crea segno, persone nuove e
   * adesioni. O tutto o niente; senza connessione la transazione fallisce invece di restare in coda.
   */
  async commit(plan: ImportPlan, email: string): Promise<void> {
    const batchRef = doc(db, 'importBatches', plan.importId);
    const scheduleRef = doc(db, 'feeSchedules', String(plan.associationYear));
    await runTransaction(db, async (tx) => {
      if ((await tx.get(batchRef)).exists()) throw new AlreadyImportedError();
      if (!(await tx.get(scheduleRef)).exists()) throw new NoFeeScheduleError();

      tx.set(batchRef, {
        associationYear: plan.associationYear,
        source: 'ACR',
        importedAt: serverTimestamp(),
        importedBy: email.trim().toLowerCase(),
        adhesionCount: plan.adhesions,
        newPersonCount: plan.newPersons.length,
        skippedRowCount: plan.skipped.length,
      });
      for (const row of plan.newPersons) {
        const personRef = doc(collection(db, 'persons'));
        tx.set(personRef, personDocument(row, plan.importId));
        tx.set(doc(db, 'adhesions', `${plan.associationYear}_${personRef.id}`), adhesionDocument(row, personRef.id, plan));
      }
      for (const { row, personId } of plan.reusedPersons) {
        tx.set(doc(db, 'adhesions', `${plan.associationYear}_${personId}`), adhesionDocument(row, personId, plan));
      }
    });
  }
}
