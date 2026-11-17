import { InjectionToken } from '@angular/core';

/** Una riga della pagina Tesserati: adesione dell'anno unita all'anagrafica (FR-019). */
export interface MemberRow {
  readonly lastName: string;
  readonly firstName: string;
  /** "AAAA-MM-GG". */
  readonly birthDate: string;
  readonly sector: string;
  readonly exportAgeBand?: string;
  readonly bond?: string;
  readonly bondId?: string;
}

/** Lettura dei tesserati importati: solo lettura, nessuna modifica. */
export interface MembersBackend {
  /** Anni associativi con almeno un import. */
  importedYears(): Promise<number[]>;
  membersOfYear(year: number): Promise<MemberRow[]>;
}

export const MEMBERS_BACKEND = new InjectionToken<MembersBackend>('MEMBERS_BACKEND');
