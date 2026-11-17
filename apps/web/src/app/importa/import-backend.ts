import { InjectionToken } from '@angular/core';
import type { ImportPlan } from '@tesseramento/import';

/** Stato dell'anno associativo letto dal file (FR-011, FR-018). */
export interface YearStatus {
  readonly hasFeeSchedule: boolean;
  readonly alreadyImported: boolean;
}

/** L'elenco ACR dell'anno è già stato importato (FR-011). */
export class AlreadyImportedError extends Error {
  constructor() {
    super('already-imported');
    this.name = 'AlreadyImportedError';
  }
}

/** L'anno non ha un listino (FR-018). */
export class NoFeeScheduleError extends Error {
  constructor() {
    super('no-fee-schedule');
    this.name = 'NoFeeScheduleError';
  }
}

/** Confine verso Firestore per l'import: permette di provare servizio e pagina con un backend finto. */
export interface ImportBackend {
  yearStatus(year: number): Promise<YearStatus>;
  /** Persone già in archivio: chiave di identità → ID del documento. */
  existingPersons(): Promise<Map<string, string>>;
  /**
   * Salva in un colpo solo segno di import, persone nuove e adesioni (FR-014).
   * Lancia `AlreadyImportedError` o `NoFeeScheduleError`; qualsiasi altro errore = nulla salvato.
   */
  commit(plan: ImportPlan, email: string): Promise<void>;
}

export const IMPORT_BACKEND = new InjectionToken<ImportBackend>('IMPORT_BACKEND');
