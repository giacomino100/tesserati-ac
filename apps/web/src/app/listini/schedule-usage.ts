import { InjectionToken } from '@angular/core';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../core/firebase';

/** Dice se per l'anno esistono adesioni (specifica 003, FR-011). */
export interface ScheduleUsage {
  isInUse(year: number): Promise<boolean>;
}

/**
 * Un anno ha adesioni se almeno un suo elenco (ACR, Giovani, Adulti) è stato importato (specifica 005, R6) o se ha
 * almeno una riconferma (specifica 008).
 */
export class FirestoreScheduleUsage implements ScheduleUsage {
  async isInUse(year: number): Promise<boolean> {
    const [batches, renewals] = await Promise.all([
      getDocs(query(collection(db, 'importBatches'), where('associationYear', '==', year), limit(1))),
      getDocs(
        query(collection(db, 'adhesions'), where('associationYear', '==', year), where('origin', '==', 'riconferma'), limit(1)),
      ),
    ]);
    return !batches.empty || !renewals.empty;
  }
}

/** Predefinito per i test senza Firestore: nessuna adesione. L'app usa `FirestoreScheduleUsage`. */
export const SCHEDULE_USAGE = new InjectionToken<ScheduleUsage>('SCHEDULE_USAGE', {
  providedIn: 'root',
  factory: (): ScheduleUsage => ({ isInUse: async () => false }),
});
