import { InjectionToken } from '@angular/core';
import type { FeeSchedule } from '@tesseramento/fees';
import type { FamilyList } from '@tesseramento/families';
import type { ArchivedPerson, NewMember } from '@tesseramento/import';

/** Quello che serve al modulo per un anno (specifica 009, research R4). */
export interface NewMemberContext {
  /** Tutte le persone in archivio, con l'ultima adesione. */
  readonly archive: readonly ArchivedPerson[];
  /** Persone con un'adesione nell'anno. */
  readonly yearIds: ReadonlySet<string>;
  /** Persone con un'adesione nell'anno precedente. */
  readonly previousYearIds: ReadonlySet<string>;
  readonly schedule?: FeeSchedule;
}

/** Iscrizione: persona nuova (`member`) oppure persona già in archivio (`personId`); `paidOn` = giorno del pagamento (013). */
export type NewMemberEntry =
  | { readonly year: number; readonly list: FamilyList; readonly paidOn?: string; readonly member: NewMember }
  | { readonly year: number; readonly list: FamilyList; readonly paidOn?: string; readonly personId: string };

/** La persona ha già un'adesione nell'anno (anche se iscritta nel frattempo da un altro utente). */
export class AlreadyEnrolledError extends Error {
  constructor() {
    super('already-enrolled');
    this.name = 'AlreadyEnrolledError';
  }
}

/** La persona ha un'adesione nell'anno precedente: va riconfermata (008). */
export class RenewableError extends Error {
  constructor() {
    super('renewable');
    this.name = 'RenewableError';
  }
}

/** Confine verso Firestore per il nuovo tesserato: permette di provare servizio e modulo con un finto. */
export interface NewMemberBackend {
  context(year: number): Promise<NewMemberContext>;
  /** Persona (se nuova) e adesione "nuovo" in una sola scrittura; `AlreadyEnrolledError`, `RenewableError`. */
  add(entry: NewMemberEntry, email: string): Promise<void>;
}

export const NEW_MEMBER_BACKEND = new InjectionToken<NewMemberBackend>('NEW_MEMBER_BACKEND');
