import { collection, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, where } from 'firebase/firestore';
import { listOfImportId, type AdhesionList, type ImportPlan, type ImportRow } from '@tesseramento/import';
import { db } from '../core/firebase';
import {
  AlreadyImportedError,
  ImportContextChangedError,
  NoFeeScheduleError,
  type ImportBackend,
  type YearContext,
} from './import-backend';

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

/** Import in Cloud Firestore (specifiche 004 e 005). Nessun dato delle righe nei log. */
export class FirestoreImportBackend implements ImportBackend {
  /** Listino, elenchi importati, persone e adesioni dell'anno, letti in parallelo (research R4 della 005). */
  async yearContext(year: number): Promise<YearContext> {
    const [schedule, batches, persons, adhesions] = await Promise.all([
      getDoc(doc(db, 'feeSchedules', String(year))),
      getDocs(query(collection(db, 'importBatches'), where('associationYear', '==', year))),
      getDocs(collection(db, 'persons')),
      getDocs(query(collection(db, 'adhesions'), where('associationYear', '==', year))),
    ]);
    const importedLists = batches.docs
      .map((b) => listOfImportId(b.id))
      .filter((l): l is AdhesionList => l !== undefined);
    const personIndex = new Map<string, string>();
    for (const person of persons.docs) {
      const key = person.data()['identityKey'];
      if (typeof key === 'string') personIndex.set(key, person.id);
    }
    const adhesionIndex = new Map<string, AdhesionList>();
    for (const adhesion of adhesions.docs) {
      const data = adhesion.data();
      const list = listOfImportId(String(data['importId']));
      if (list) adhesionIndex.set(String(data['personId']), list);
    }
    return { hasFeeSchedule: schedule.exists(), importedLists, persons: personIndex, adhesions: adhesionIndex };
  }

  /**
   * Una sola transazione: rilegge segno dell'elenco, listino e adesioni dell'anno delle persone riusate,
   * poi crea segno, persone nuove e adesioni. O tutto o niente; senza connessione fallisce invece di
   * restare in coda.
   */
  async commit(plan: ImportPlan, email: string): Promise<void> {
    const batchRef = doc(db, 'importBatches', plan.importId);
    const scheduleRef = doc(db, 'feeSchedules', String(plan.associationYear));
    const adhesionRef = (personId: string) => doc(db, 'adhesions', `${plan.associationYear}_${personId}`);
    await runTransaction(db, async (tx) => {
      if ((await tx.get(batchRef)).exists()) throw new AlreadyImportedError(plan.list);
      if (!(await tx.get(scheduleRef)).exists()) throw new NoFeeScheduleError();
      for (const { personId } of plan.reusedPersons) {
        if ((await tx.get(adhesionRef(personId))).exists()) throw new ImportContextChangedError();
      }

      tx.set(batchRef, {
        associationYear: plan.associationYear,
        source: plan.list,
        importedAt: serverTimestamp(),
        importedBy: email.trim().toLowerCase(),
        adhesionCount: plan.adhesions,
        newPersonCount: plan.newPersons.length,
        skippedRowCount: plan.skipped.length,
      });
      for (const row of plan.newPersons) {
        const personRef = doc(collection(db, 'persons'));
        tx.set(personRef, personDocument(row, plan.importId));
        tx.set(adhesionRef(personRef.id), adhesionDocument(row, personRef.id, plan));
      }
      for (const { row, personId } of plan.reusedPersons) {
        tx.set(adhesionRef(personId), adhesionDocument(row, personId, plan));
      }
    });
  }
}
