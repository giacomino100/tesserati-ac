import { InjectionToken } from '@angular/core';
import type { FeeSchedule } from '@tesseramento/fees';

/** Listino come sta in archivio: le quote più data ed email dell'ultima modifica (FR-016). */
export interface StoredSchedule {
  readonly schedule: FeeSchedule;
  readonly updatedAt: Date;
  /** Email in minuscolo di chi ha creato o modificato per ultimo il listino. */
  readonly updatedBy: string;
}

/** Il listino è cambiato dopo che l'utente l'ha aperto (FR-014). */
export class ScheduleConflictError extends Error {
  constructor() {
    super('schedule-conflict');
    this.name = 'ScheduleConflictError';
  }
}

/** Confine verso Firestore: permette di provare il servizio con un backend finto. */
export interface FeeScheduleBackend {
  list(): Promise<StoredSchedule[]>;
  get(year: number): Promise<StoredSchedule | undefined>;
  /** Crea il listino dell'anno; fallisce se le regole non lo consentono o senza connessione. */
  create(schedule: FeeSchedule, email: string): Promise<void>;
  /**
   * Modifica il listino. Se `updatedAt` salvato è diverso da `openedAt` e `overwrite` è false
   * lancia `ScheduleConflictError` senza scrivere.
   */
  update(schedule: FeeSchedule, email: string, openedAt: Date, overwrite: boolean): Promise<void>;
}

export const FEE_SCHEDULE_BACKEND = new InjectionToken<FeeScheduleBackend>('FEE_SCHEDULE_BACKEND');
