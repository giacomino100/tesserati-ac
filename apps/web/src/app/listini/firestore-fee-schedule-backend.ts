import { collection, doc, getDoc, getDocs, runTransaction, serverTimestamp } from 'firebase/firestore';
import type { FeeSchedule } from '@tesseramento/fees';
import { db } from '../core/firebase';
import { ScheduleConflictError, type FeeScheduleBackend, type StoredSchedule } from './fee-schedule-backend';
import { documentToStored, scheduleToDocument } from './schedule-mapper';

const COLLECTION = 'feeSchedules';

/** Listini in Cloud Firestore: un documento per anno, ID = anno di inizio (data-model.md). */
export class FirestoreFeeScheduleBackend implements FeeScheduleBackend {
  async list(): Promise<StoredSchedule[]> {
    const snapshot = await getDocs(collection(db, COLLECTION));
    return snapshot.docs.map((d) => documentToStored(d.data()));
  }

  async get(year: number): Promise<StoredSchedule | undefined> {
    const snapshot = await getDoc(doc(db, COLLECTION, String(year)));
    return snapshot.exists() ? documentToStored(snapshot.data()) : undefined;
  }

  /**
   * Crea il listino in una transazione (non con un semplice `setDoc`): senza connessione la
   * transazione fallisce, mentre `setDoc` metterebbe la scrittura in coda senza mai segnalare l'errore.
   */
  async create(schedule: FeeSchedule, email: string): Promise<void> {
    const ref = doc(db, COLLECTION, String(schedule.associationYear));
    await runTransaction(db, async (tx) => {
      if ((await tx.get(ref)).exists()) {
        throw Object.assign(new Error('already-exists'), { code: 'already-exists' });
      }
      tx.set(ref, { ...scheduleToDocument(schedule, email), updatedAt: serverTimestamp() });
    });
  }

  /**
   * Modifica in una transazione: rilegge il documento e, se `updatedAt` non è più quello visto
   * all'apertura e non si è scelto di sovrascrivere, si ferma con un conflitto senza scrivere.
   */
  async update(schedule: FeeSchedule, email: string, openedAt: Date, overwrite: boolean): Promise<void> {
    const ref = doc(db, COLLECTION, String(schedule.associationYear));
    await runTransaction(db, async (tx) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists()) throw Object.assign(new Error('not-found'), { code: 'not-found' });
      if (!overwrite && documentToStored(snapshot.data()).updatedAt.getTime() !== openedAt.getTime()) {
        throw new ScheduleConflictError();
      }
      tx.update(ref, { ...scheduleToDocument(schedule, email), updatedAt: serverTimestamp() });
    });
  }
}
