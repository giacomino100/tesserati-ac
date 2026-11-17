import { InjectionToken } from '@angular/core';
import type { FeeSchedule } from '@tesseramento/fees';
import type { RenewalDraft, YearMember } from '@tesseramento/families';

/** Chi e quando ha riconfermato una persona (solo per mostrarlo). */
export interface RenewalInfo {
  readonly renewedAt: Date;
  readonly renewedBy: string;
}

/** Una delle persone ha già un'adesione nell'anno nuovo: nulla salvato del gruppo. */
export class AlreadyRenewedError extends Error {
  constructor() {
    super('already-renewed');
    this.name = 'AlreadyRenewedError';
  }
}

/** Salvataggio a gruppi interrotto: i primi `saved` sono stati riconfermati, gli altri no. */
export class PartialRenewalError extends Error {
  constructor(readonly saved: number) {
    super('partial-renewal');
    this.name = 'PartialRenewalError';
  }
}

/** La persona è in una famiglia confermata dell'anno: la riconferma non si annulla. */
export class RenewalInFamilyError extends Error {
  constructor() {
    super('renewal-in-family');
    this.name = 'RenewalInFamilyError';
  }
}

/** Confine verso Firestore per le riconferme (specifica 008): permette di provare servizio e pagina con un finto. */
export interface RenewalsBackend {
  /** Anni con tesserati (importati o riconfermati). */
  memberYears(): Promise<number[]>;
  /** Tesserati dell'anno con `origin`. */
  yearMembers(year: number): Promise<YearMember[]>;
  /** Appartenenze dell'anno: personId → familyId. */
  memberships(year: number): Promise<Map<string, string>>;
  schedule(year: number): Promise<FeeSchedule | undefined>;
  /** Riconferme dell'anno: personId → chi e quando. */
  renewals(year: number): Promise<Map<string, RenewalInfo>>;
  /**
   * Crea le adesioni a gruppi di 15 (research R5). Lancia `AlreadyRenewedError` o `PartialRenewalError`;
   * qualsiasi altro errore = nulla salvato.
   */
  renew(drafts: readonly RenewalDraft[], email: string): Promise<void>;
  /** Cancella l'adesione riconfermata; `RenewalInFamilyError` se la persona è in una famiglia dell'anno. */
  undo(year: number, personId: string): Promise<void>;
  /** Esiste una quota salvata del nucleo da 1 della persona (specifica 010)? */
  hasSavedFee(year: number, personId: string): Promise<boolean>;
}

/** Persone per gruppo di salvataggio: 1 lettura per persona + il listino ≤ 20 letture delle regole. */
export const RENEWAL_GROUP_SIZE = 15;

export const RENEWALS_BACKEND = new InjectionToken<RenewalsBackend>('RENEWALS_BACKEND');
