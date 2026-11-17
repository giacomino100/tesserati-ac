import { InjectionToken } from '@angular/core';
import type { FeeSchedule } from '@tesseramento/fees';
import type { ConfirmedFamily, RenewalDraft, YearMember } from '@tesseramento/families';
import type { FamilyDraft } from '../famiglie/families-backend';
import type { ListChangeRequest } from './members-backend';

/**
 * Confine unico della pagina Tesserati (specifica 013): lettura dell'anno, conferma = pagato, pagamento, famiglia, cambio
 * di elenco. L'implementazione Firestore riusa i backend di 007, 008, 011.
 */
export interface YearBackend {
  /** Anni con tesserati (import, riconferme, nuovi). */
  memberYears(): Promise<number[]>;
  /** Tesserati dell'anno con origine, pagamento, eccezione e `familyOptOut`. */
  yearMembers(year: number): Promise<YearMember[]>;
  memberships(year: number): Promise<Map<string, string>>;
  confirmedFamilies(year: number): Promise<ConfirmedFamily[]>;
  schedule(year: number): Promise<FeeSchedule | undefined>;
  /** Conferma = pagato: adesioni dell'anno con il giorno del pagamento. `AlreadyRenewedError` se già iscritte. */
  renew(drafts: readonly RenewalDraft[], paidOn: string, email: string): Promise<void>;
  /** Annulla una conferma o un'iscrizione; `RenewalInFamilyError` se la persona è in una famiglia dell'anno. */
  undo(year: number, personId: string): Promise<void>;
  hasSavedFee(year: number, personId: string): Promise<boolean>;
  /** "Registra pagamento" su adesioni esistenti. */
  registerPayment(year: number, personIds: readonly string[], paidOn: string, email: string): Promise<void>;
  /** Crea o aggiorna una famiglia dell'anno (regole della 007). */
  confirmFamily(draft: FamilyDraft, email: string): Promise<void>;
  dissolveFamily(familyId: string): Promise<void>;
  /** Tolta a mano da una famiglia: non viene riaggiunta da sola (o di nuovo sì, con `false`). */
  setFamilyOptOut(year: number, personId: string, value: boolean): Promise<void>;
  /** Cambio di elenco (011). */
  changeList(changes: readonly ListChangeRequest[], email: string): Promise<void>;
}

export const YEAR_BACKEND = new InjectionToken<YearBackend>('YEAR_BACKEND');

/** Data di oggi (sostituibile nei test). */
export const TODAY = new InjectionToken<() => Date>('TODAY', { providedIn: 'root', factory: () => () => new Date() });
