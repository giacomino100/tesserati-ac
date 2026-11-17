import { InjectionToken } from '@angular/core';
import type { ConfirmedFamily, YearMember } from '@tesseramento/families';

/** Famiglia da salvare: senza `id` è nuova; con `id` è una famiglia confermata da aggiornare. */
export interface FamilyDraft {
  readonly id?: string;
  readonly associationYear: number;
  readonly memberIds: readonly string[];
  readonly origin: 'legame' | 'manuale';
  readonly bondId?: string;
}

/** Un componente è già in un'altra famiglia dell'anno (appartenenza di un'altra famiglia). */
export class MemberInOtherFamilyError extends Error {
  constructor(readonly personId: string) {
    super('member-in-other-family');
    this.name = 'MemberInOtherFamilyError';
  }
}

/** Confine verso Firestore per le famiglie (specifica 007): permette di provare servizio e pagina con un finto. */
export interface FamiliesBackend {
  importedYears(): Promise<number[]>;
  /** Tesserati dell'anno: adesioni dell'anno unite alle persone. */
  yearMembers(year: number): Promise<YearMember[]>;
  confirmedFamilies(year: number): Promise<ConfirmedFamily[]>;
  /** Appartenenze dell'anno: personId → familyId (fonte di verità, research R8). */
  memberships(year: number): Promise<Map<string, string>>;
  /** Conferma (crea o aggiorna) le famiglie in un'unica transazione. */
  confirm(drafts: readonly FamilyDraft[], email: string): Promise<void>;
  /** Scioglie la famiglia: la cancella con le sue appartenenze. */
  dissolve(familyId: string): Promise<void>;
}

export const FAMILIES_BACKEND = new InjectionToken<FamiliesBackend>('FAMILIES_BACKEND');
