import { InjectionToken } from '@angular/core';
import { doc, getDoc } from 'firebase/firestore';
import { acrImportId } from '@tesseramento/import';
import { db } from '../core/firebase';

/** Dice se per l'anno esistono adesioni (specifica 003, FR-011). */
export interface ScheduleUsage {
  isInUse(year: number): Promise<boolean>;
}

/**
 * Un anno ha adesioni se il suo elenco ACR è stato importato (specifica 004, research R10).
 * Con la 005 conterà qualsiasi elenco dell'anno.
 */
export class FirestoreScheduleUsage implements ScheduleUsage {
  async isInUse(year: number): Promise<boolean> {
    return (await getDoc(doc(db, 'importBatches', acrImportId(year)))).exists();
  }
}

/** Predefinito per i test senza Firestore: nessuna adesione. L'app usa `FirestoreScheduleUsage`. */
export const SCHEDULE_USAGE = new InjectionToken<ScheduleUsage>('SCHEDULE_USAGE', {
  providedIn: 'root',
  factory: (): ScheduleUsage => ({ isInUse: async () => false }),
});
