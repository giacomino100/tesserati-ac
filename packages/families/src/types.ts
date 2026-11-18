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
  /** Come è nata l'adesione dell'anno (specifiche 008 e 009); assente = import. */
  readonly origin?: 'import' | 'riconferma' | 'nuovo';
  /** L'elenco dell'anno è un'eccezione decisa a mano con nota (specifica 011). */
  readonly exception?: true;
  /** Nota dell'eccezione (011), solo per mostrarla. */
  readonly listNote?: string;
  /** Giorno del pagamento "AAAA-MM-GG" (specifica 013). */
  readonly paidOn?: string;
  /** Tolta a mano dalla famiglia: non viene riaggiunta da sola (specifica 013). */
  readonly familyOptOut?: true;
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

/* ---- Specifica 010: nuclei dell'anno e quote ---- */

/** Nucleo dell'anno: famiglia confermata (chiave "f-{familyId}") o tesserato senza famiglia ("p-{personId}"). */
export interface Household {
  readonly key: string;
  readonly familyId?: string;
  readonly bondId?: string;
  /** Dal più anziano al più giovane. */
  readonly members: readonly YearMember[];
}

export interface HouseholdsOfYear {
  readonly households: readonly Household[];
  /** Famiglie suggerite (con almeno 2 componenti) non ancora confermate: i loro componenti sono singoli. */
  readonly unconfirmedSuggested: number;
}

/** Riga del calcolo di un componente, come la dà @tesseramento/fees. */
export interface FeeLine {
  readonly memberId: string;
  readonly age: number;
  readonly band: 'acr' | 'giovanissimi' | 'giovani' | 'adulti';
  readonly fullCents: number;
  readonly benefit: 'none' | 'discount20' | 'free' | 'inAcrPackage';
  readonly amountCents?: number;
}

export type NotCoveredKind = 'householdTooLarge' | 'memberUnderMinAge' | 'invalidInput';

export type FeeOutcome =
  | {
      readonly kind: 'calculated';
      readonly lines: readonly FeeLine[];
      readonly acrPackageCents?: number;
      readonly totalCents: number;
    }
  /** Non previsto dal PDF (regole-quote.md §4): quota manuale del nucleo con nota. */
  | { readonly kind: 'notCovered'; readonly reason: NotCoveredKind }
  /** Errore interno (es. listino di un altro anno): non è un caso non previsto. */
  | { readonly kind: 'error' };

export interface HouseholdFee {
  readonly household: Household;
  readonly outcome: FeeOutcome;
}

/** Quota salvata di un nucleo (istantanea per anno). */
export interface SavedHouseholdFee {
  readonly key: string;
  readonly associationYear: number;
  readonly memberIds: readonly string[];
  readonly kind: 'calculated' | 'manual';
  readonly lines?: readonly FeeLine[];
  readonly acrPackageCents?: number;
  readonly manualCents?: number;
  readonly note?: string;
  readonly reason?: NotCoveredKind;
  readonly totalCents: number;
  readonly savedAt: Date;
  readonly savedBy: string;
}

export interface FeeComparison {
  readonly key: string;
  readonly status: 'new' | 'unchanged' | 'changed' | 'removed';
  readonly current?: HouseholdFee;
  readonly saved?: SavedHouseholdFee;
  /** Non previsto senza una quota manuale valida. */
  readonly needsManual: boolean;
}

export interface YearTotals {
  /** Calcolo attuale + quote manuali valide. */
  readonly totalCents: number;
  /** Somma delle quote salvate dei nuclei presenti. */
  readonly savedTotalCents: number;
  readonly calculated: number;
  readonly manual: number;
  readonly missing: number;
  /** Nuclei da salvare o aggiornare (salvate diverse dal calcolo attuale, o non più presenti). */
  readonly toUpdate: number;
}

/* ---- Specifica 008: riconferma ---- */

export type RenewalWarning =
  /** L'elenco del nuovo anno è diverso da quello dell'anno precedente. */
  | { readonly kind: 'listChange'; readonly from: FamilyList; readonly to: FamilyList }
  /** Età sotto il minimo del listino: resta ACR, quota non prevista. */
  | { readonly kind: 'underMinAge'; readonly minAge: number }
  /** Data di nascita non valida o successiva all'anno: non riconfermabile. */
  | { readonly kind: 'invalidBirthDate' }
  /** L'anno prima l'elenco era un'eccezione decisa a mano (specifica 011): ora vale di nuovo l'età. */
  | { readonly kind: 'previousException'; readonly list: FamilyList };

/** Tesserato dell'anno precedente senza adesione nell'anno nuovo. */
export interface RenewalCandidate {
  /** Come nell'anno precedente (elenco, legame). */
  readonly member: YearMember;
  /** Età nell'anno nuovo. */
  readonly age: number;
  /** Elenco del nuovo anno; assente se la data non è valida o manca il listino. */
  readonly list?: FamilyList;
  readonly warnings: readonly RenewalWarning[];
  readonly renewable: boolean;
}

/** Tesserati dell'anno precedente con lo stesso N. Legame, dal più anziano. */
export interface RenewalGroup {
  readonly bondId: string;
  readonly bond?: string;
  readonly candidates: readonly RenewalCandidate[];
}

/** Tesserato dell'anno precedente già iscritto nell'anno nuovo. */
export interface RenewedMember {
  /** Come nell'anno nuovo. */
  readonly member: YearMember;
  readonly origin: 'import' | 'riconferma';
  /** In una famiglia confermata dell'anno nuovo. */
  readonly inFamily: boolean;
  /** Solo riconferme fuori da famiglie confermate. */
  readonly undoable: boolean;
}

export interface RenewalView {
  readonly groups: readonly RenewalGroup[];
  readonly singles: readonly RenewalCandidate[];
  readonly renewed: readonly RenewedMember[];
  readonly pendingCount: number;
  readonly renewedCount: number;
}

/** Adesione da creare per una riconferma (solo ID, elenco e legame: nessun dato anagrafico). */
export interface RenewalDraft {
  readonly personId: string;
  readonly associationYear: number;
  readonly list: FamilyList;
  readonly bond?: string;
  readonly bondId?: string;
}

/* ---- Specifica 011: elenco rispetto all'età ---- */

export type ListStatus =
  | { readonly kind: 'aligned' }
  | { readonly kind: 'misaligned'; readonly expected: FamilyList }
  /** Eccezione con nota; `expected` se c'è il listino. */
  | { readonly kind: 'exception'; readonly expected?: FamilyList }
  /** Senza listino o con data non valida. */
  | { readonly kind: 'unknown' };

/* ---- Specifica 013: elenco unico di Tesserati e famiglia ---- */

export interface MemberYearRow {
  readonly member: YearMember;
  readonly status: 'pending' | 'enrolled';
  /** Solo per chi è da confermare: età, elenco del nuovo anno e avvisi (008). */
  readonly candidate?: RenewalCandidate;
  readonly origin?: 'import' | 'riconferma' | 'nuovo';
  readonly paidOn?: string;
  readonly familyId?: string;
  /** Conferma o iscrizione annullabile (riconferma o nuovo, fuori da famiglie). */
  readonly undoable: boolean;
}

export interface MemberYearView {
  readonly rows: readonly MemberYearRow[];
  readonly pendingCount: number;
  readonly enrolledCount: number;
}

export type FamilyUpdate =
  | { readonly kind: 'none' }
  | { readonly kind: 'add'; readonly familyId: string; readonly memberIds: readonly string[] }
  | { readonly kind: 'create'; readonly bondId: string; readonly memberIds: readonly string[] };

export interface FamilyPanelMember {
  readonly member: YearMember;
  readonly status: 'pending' | 'enrolled';
  readonly inFamily: boolean;
}

export interface FamilyPanel {
  readonly familyId?: string;
  readonly bondId?: string;
  readonly members: readonly FamilyPanelMember[];
  /** Iscritti dell'anno fuori da famiglie, aggiungibili. */
  readonly addable: readonly YearMember[];
  /** Iscritti del pannello fuori da ogni famiglia, da riunire con "Conferma famiglia". */
  readonly joinable: readonly string[];
}
