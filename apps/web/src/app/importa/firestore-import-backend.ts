import { collection, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, where } from 'firebase/firestore';
import {
  listOfAdhesion,
  listOfImportId,
  type AdhesionList,
  type ArchivedPerson,
  type ImportPlan,
  type ImportRow,
} from '@tesseramento/import';
import { db } from '../core/firebase';
import { documentToStored } from '../listini/schedule-mapper';
import {
  AlreadyImportedError,
  ImportContextChangedError,
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

/** Import in Cloud Firestore (specifiche 004–006). Nessun dato delle righe nei log. */
export class FirestoreImportBackend implements ImportBackend {
  /**
   * Listino, elenchi importati, archivio completo (con l'ultima adesione di ogni persona) e adesioni
   * dell'anno, letti in parallelo (research R4 della 005, R8 della 006).
   */
  async yearContext(year: number): Promise<YearContext> {
    const [schedule, batches, persons, adhesions] = await Promise.all([
      getDoc(doc(db, 'feeSchedules', String(year))),
      getDocs(query(collection(db, 'importBatches'), where('associationYear', '==', year))),
      getDocs(collection(db, 'persons')),
      getDocs(collection(db, 'adhesions')),
    ]);
    const importedLists = batches.docs
      .map((b) => listOfImportId(b.id))
      .filter((l): l is AdhesionList => l !== undefined);

    const yearAdhesions = new Map<string, AdhesionList>();
    const renewedIds = new Set<string>();
    const lastAdhesion = new Map<string, { year: number; list: AdhesionList }>();
    for (const adhesion of adhesions.docs) {
      const data = adhesion.data();
      const list = listOfAdhesion(
        typeof data['importId'] === 'string' ? data['importId'] : undefined,
        typeof data['list'] === 'string' ? data['list'] : undefined,
      );
      const personId = String(data['personId']);
      const adhesionYear = Number(data['associationYear']);
      if (!list || !Number.isInteger(adhesionYear)) continue;
      if (adhesionYear === year) yearAdhesions.set(personId, list);
      if (adhesionYear === year && data['origin'] === 'riconferma') renewedIds.add(personId);
      const last = lastAdhesion.get(personId);
      if (!last || adhesionYear > last.year) lastAdhesion.set(personId, { year: adhesionYear, list });
    }

    const archive: ArchivedPerson[] = [];
    for (const person of persons.docs) {
      const data = person.data();
      if (typeof data['identityKey'] !== 'string') continue;
      const taxCode = typeof data['taxCode'] === 'string' ? data['taxCode'] : undefined;
      const last = lastAdhesion.get(person.id);
      archive.push({
        id: person.id,
        lastName: String(data['lastName']),
        firstName: String(data['firstName']),
        birthDate: String(data['birthDate']),
        identityKey: data['identityKey'],
        ...(taxCode ? { taxCode } : {}),
        ...(last ? { lastAdhesion: last } : {}),
      });
    }

    return {
      hasFeeSchedule: schedule.exists(),
      ...(schedule.exists() ? { feeSchedule: documentToStored(schedule.data()).schedule } : {}),
      importedLists,
      archive,
      adhesions: yearAdhesions,
      renewedIds,
    };
  }

  /**
   * Una sola transazione: rilegge segno dell'elenco e adesioni dell'anno delle persone riusate (il listino non serve
   * più, specifica 008),
   * poi crea segno, persone nuove e adesioni. O tutto o niente; senza connessione fallisce invece di
   * restare in coda.
   */
  async commit(plan: ImportPlan, email: string): Promise<void> {
    const batchRef = doc(db, 'importBatches', plan.importId);
    const adhesionRef = (personId: string) => doc(db, 'adhesions', `${plan.associationYear}_${personId}`);
    await runTransaction(db, async (tx) => {
      if ((await tx.get(batchRef)).exists()) throw new AlreadyImportedError(plan.list);
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
