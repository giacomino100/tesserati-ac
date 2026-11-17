import { InjectionToken } from '@angular/core';
import type { FeeSchedule } from '@tesseramento/fees';
import type { AdhesionList } from '@tesseramento/import';

/** Ultimo cambio di elenco di un'adesione (specifica 011). */
export interface ListChange {
  readonly from: AdhesionList;
  readonly at: Date;
  readonly by: string;
  /** Presente = eccezione decisa a mano. */
  readonly note?: string;
}

/** Una riga della pagina Tesserati: adesione dell'anno unita all'anagrafica (FR-019; 011). */
export interface MemberRow {
  readonly adhesionId: string;
  readonly personId: string;
  readonly lastName: string;
  readonly firstName: string;
  /** "AAAA-MM-GG". */
  readonly birthDate: string;
  /** Elenco attuale (011: quello salvato ha la precedenza su quello del segno di import). */
  readonly list: AdhesionList;
  readonly sector: string;
  /** Adesione nata da un import (ha un settore dell'export). */
  readonly imported: boolean;
  /** Settore dell'export, conservato al primo cambio di elenco (011). */
  readonly exportSector?: string;
  readonly exportAgeBand?: string;
  readonly bond?: string;
  readonly bondId?: string;
  readonly listChange?: ListChange;
}

/** Cambio richiesto: nuovo elenco ed eventuale nota (eccezione). */
export interface ListChangeRequest {
  readonly adhesionId: string;
  readonly to: AdhesionList;
  readonly note?: string;
}

/** Tesserati dell'anno e cambio di elenco (specifica 011). */
export interface MembersBackend {
  /** Anni associativi con tesserati. */
  importedYears(): Promise<number[]>;
  membersOfYear(year: number): Promise<MemberRow[]>;
  schedule(year: number): Promise<FeeSchedule | undefined>;
  /** Tutto o niente; nessun altro campo dell'adesione cambia. */
  changeList(changes: readonly ListChangeRequest[], email: string): Promise<void>;
}

export const MEMBERS_BACKEND = new InjectionToken<MembersBackend>('MEMBERS_BACKEND');
