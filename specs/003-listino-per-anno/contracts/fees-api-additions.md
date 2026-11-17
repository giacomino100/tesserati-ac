# Contract: aggiunte all'API di `@tesseramento/fees`

**Feature**: [../spec.md](../spec.md) · Base: [specifica 002](../../002-calcolo-quote-famiglia/contracts/fees-api.md)

Aggiunte **additive**: `calculateHouseholdFee`, `bandFor`, `SCHEDULE_2026_27` e i tipi esistenti non
cambiano. Tutte le funzioni sono pure: nessun accesso a rete, archivi, data corrente.

```ts
// Importi
export function parseEuros(text: string): { ok: true; cents: number } | { ok: false; code: MoneyErrorCode };
export type MoneyErrorCode = 'required' | 'notNumber' | 'tooManyDecimals' | 'notPositive';
export function formatEuros(cents: number): string;            // 2600 → "26,00"

// Bozza del listino (le quote come testo in euro)
export interface ScheduleDraft {
  readonly acrPackage: string;
  readonly bands: Readonly<Record<AgeBand, { readonly full: string; readonly discounted: string }>>;
}
export type FieldIssueCode = MoneyErrorCode | 'discountedAboveFull';
export interface FieldIssue { readonly field: DraftField; readonly code: FieldIssueCode }
export type DraftField = 'acrPackage' | `${AgeBand}.full` | `${AgeBand}.discounted`;

// Bozza → listino (solo quote; le regole fisse vengono da `base`)
export function draftToSchedule(draft: ScheduleDraft, base: FeeSchedule):
  | { ok: true; schedule: FeeSchedule }
  | { ok: false; issues: readonly FieldIssue[] };
export function scheduleToDraft(schedule: FeeSchedule): ScheduleDraft;

// Controllo di un listino già in forma di centesimi (usato anche per i dati letti dall'archivio)
export function validateFeeSchedule(schedule: FeeSchedule): readonly FieldIssue[];

// Anni
export function labelFor(associationYear: number): string;      // 2027 → "2027/28"
export function nextAssociationYear(existingYears: readonly number[]): number;  // [2026] → 2027; [] → errore
export function copyForNextYear(latest: FeeSchedule): FeeSchedule; // anno+1, etichetta nuova, quote copiate
```

## Garanzie

| # | Garanzia | Requisito |
|---|---|---|
| P1 | `parseEuros` accetta virgola o punto ("26,5", "26.50", "26"), rifiuta vuoto, non numerico, più di due decimali, zero e negativi, separatori delle migliaia | FR-006, FR-008 |
| P2 | `parseEuros(formatEuros(n))` restituisce `n` per ogni `n` intero positivo | FR-007 |
| P3 | `draftToSchedule` restituisce **tutti** gli errori di campo insieme, mai importi arrotondati: "26,555" è un errore, non 26,56 | FR-006, FR-007 |
| P4 | `draftToSchedule` non modifica fasce d'età, età minima, massimo del nucleo, anno ed etichetta di `base` | FR-005 |
| P5 | `validateFeeSchedule(SCHEDULE_2026_27)` è vuoto; scontata > piena e pacchetto ≤ 0 sono segnalati | FR-006 |
| P6 | `nextAssociationYear` restituisce l'ultimo anno + 1; `copyForNextYear` non modifica l'input e conserva le regole fisse | FR-004 |
| P7 | Il listino riletto dall'archivio (serializzato in JSON e riletto) dà gli stessi totali di `regole-quote.md` §3 per tutti i 29 esempi | FR-009, SC-005 |
