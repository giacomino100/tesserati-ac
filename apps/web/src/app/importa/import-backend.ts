import { InjectionToken } from '@angular/core';
import type { FeeSchedule } from '@tesseramento/fees';
import { listLabel, type AdhesionList, type ArchivedPerson, type ImportPlan } from '@tesseramento/import';

/** Ciò che serve dall'archivio per l'anteprima di un anno (specifica 005, research R4). */
export interface YearContext {
  readonly hasFeeSchedule: boolean;
  /** Il listino dell'anno, per gli avvisi su età e settore (specifica 006). */
  readonly feeSchedule?: FeeSchedule;
  /** Elenchi dell'anno già importati. */
  readonly importedLists: readonly AdhesionList[];
  /** Tutte le persone in archivio, con l'ultima adesione (specifica 006). */
  readonly archive: readonly ArchivedPerson[];
  /** Adesioni dell'anno: ID persona → elenco da cui proviene. */
  readonly adhesions: ReadonlyMap<string, AdhesionList>;
}

/** Quell'elenco dell'anno è già stato importato. */
export class AlreadyImportedError extends Error {
  constructor(readonly list: AdhesionList) {
    super(`already-imported:${listLabel(list)}`);
    this.name = 'AlreadyImportedError';
  }
}

/** L'anno non ha un listino. */
export class NoFeeScheduleError extends Error {
  constructor() {
    super('no-fee-schedule');
    this.name = 'NoFeeScheduleError';
  }
}

/** Tra anteprima e salvataggio una persona riusata ha ricevuto un'adesione dell'anno da un altro elenco. */
export class ImportContextChangedError extends Error {
  constructor() {
    super('import-context-changed');
    this.name = 'ImportContextChangedError';
  }
}

/** Confine verso Firestore per l'import: permette di provare servizio e pagina con un backend finto. */
export interface ImportBackend {
  yearContext(year: number): Promise<YearContext>;
  /**
   * Salva in un colpo solo segno di import, persone nuove e adesioni.
   * Lancia `AlreadyImportedError`, `NoFeeScheduleError` o `ImportContextChangedError`;
   * qualsiasi altro errore = nulla salvato.
   */
  commit(plan: ImportPlan, email: string): Promise<void>;
}

export const IMPORT_BACKEND = new InjectionToken<ImportBackend>('IMPORT_BACKEND');
