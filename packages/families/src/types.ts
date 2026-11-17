/** Elenco di provenienza dell'adesione (come in @tesseramento/import). */
export type FamilyList = 'ACR' | 'GIOVANI' | 'ADULTI';

/** Tesserato dell'anno: persona con un'adesione nell'anno associativo. */
export interface YearMember {
  readonly personId: string;
  readonly lastName: string;
  readonly firstName: string;
  /** "AAAA-MM-GG". */
  readonly birthDate: string;
  readonly list: FamilyList;
  /** Legame dell'export, es. "C3". */
  readonly bond?: string;
  /** N. Legame dell'export, es. "900002". */
  readonly bondId?: string;
}

/** Famiglia confermata da una persona per un anno (regole-famiglia.md §1). */
export interface ConfirmedFamily {
  readonly id: string;
  readonly associationYear: number;
  readonly memberIds: readonly string[];
  readonly origin: 'legame' | 'manuale';
  readonly bondId?: string;
  readonly confirmedAt: Date;
  readonly confirmedBy: string;
}

/** "C3" → lettera e numero di componenti tesserati. */
export interface Bond {
  readonly kind: string;
  readonly size: number;
}

export type FamilyWarning =
  | { readonly kind: 'sizeMismatch'; readonly expected: number; readonly found: number }
  | { readonly kind: 'bondMismatch'; readonly bonds: readonly string[] }
  /** Persone nei memberIds senza appartenenza verso questa famiglia (research R8): ignorate. */
  | { readonly kind: 'inconsistent'; readonly personIds: readonly string[] };

/** Componente con lo stesso N. Legame ma già in un'altra famiglia confermata. */
export interface ElsewhereMember {
  readonly member: YearMember;
  readonly familyId: string;
}

export interface SuggestedFamily {
  readonly bondId: string;
  /** Componenti non ancora in una famiglia confermata, dal più anziano al più giovane. */
  readonly members: readonly YearMember[];
  readonly bond?: string;
  readonly warnings: readonly FamilyWarning[];
  /** Almeno 2 componenti. */
  readonly confirmable: boolean;
  readonly elsewhere: readonly ElsewhereMember[];
}

/** Famiglia confermata con i suoi componenti effettivi (secondo le appartenenze). */
export interface ConfirmedFamilyView {
  readonly family: ConfirmedFamily;
  readonly members: readonly YearMember[];
  readonly warnings: readonly FamilyWarning[];
}

/** Tesserato fuori da ogni famiglia con lo stesso N. Legame di una famiglia confermata. */
export interface ProposedAddition {
  readonly familyId: string;
  readonly member: YearMember;
}

export interface YearFamilies {
  readonly confirmed: readonly ConfirmedFamilyView[];
  readonly suggested: readonly SuggestedFamily[];
  readonly additions: readonly ProposedAddition[];
  readonly withoutFamily: readonly YearMember[];
}

export type FamilyIssue =
  | { readonly kind: 'tooFew' }
  | { readonly kind: 'notInYear'; readonly personId: string }
  | { readonly kind: 'inOtherFamily'; readonly personId: string; readonly familyId: string };
