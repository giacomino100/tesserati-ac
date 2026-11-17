import { InjectionToken } from '@angular/core';
import type { SavedHouseholdFee } from '@tesseramento/families';

/** Quota da salvare: come quella salvata, senza chi e quando (li mette il backend). */
export type HouseholdFeeEntry = Omit<SavedHouseholdFee, 'savedAt' | 'savedBy'>;

/** Confine verso Firestore per le quote dei nuclei (specifica 010). */
export interface HouseholdFeesBackend {
  saved(year: number): Promise<SavedHouseholdFee[]>;
  /** Salva le quote e cancella quelle dei nuclei indicati, in un'unica transazione. */
  save(entries: readonly HouseholdFeeEntry[], removedKeys: readonly string[], year: number, email: string): Promise<void>;
}

export const HOUSEHOLD_FEES_BACKEND = new InjectionToken<HouseholdFeesBackend>('HOUSEHOLD_FEES_BACKEND');
