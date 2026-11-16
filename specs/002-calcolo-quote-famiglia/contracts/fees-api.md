# Contract: API pubblica di `@tesseramento/fees`

**Feature**: [../spec.md](../spec.md) · Tipi completi in [../data-model.md](../data-model.md)

Il pacchetto espone **solo** quanto segue (da `packages/fees/src/index.ts`). Tutto il resto è
interno. Le funzioni sono pure: nessun accesso a rete, archivi, data corrente o variabili globali.

```ts
// Tipi (vedi data-model.md)
export type AgeBand = 'acr' | 'giovanissimi' | 'giovani' | 'adulti';
export interface FeeSchedule { /* … */ }
export interface HouseholdMember { /* … */ }
export interface HouseholdFeeInput { /* … */ }
export type HouseholdFeeResult =
  | { status: 'calculated'; /* … */ }
  | { status: 'notCovered'; /* … */ }
  | { status: 'invalidInput'; /* … */ };

// Listino ufficiale 2026/27 (dal PDF docs/dominio/fonti/quote-tesseramento-2026-27.pdf)
export const SCHEDULE_2026_27: FeeSchedule;

// Fascia di una persona per un anno; undefined se sotto minAge
export function bandFor(birthDate: string, schedule: FeeSchedule): AgeBand | undefined;

// Calcolo del nucleo (FR-001…FR-013)
export function calculateHouseholdFee(input: HouseholdFeeInput): HouseholdFeeResult;
```

## Garanzie

| # | Garanzia | Requisito |
|---|---|---|
| G1 | Stesso input → stesso output, per qualunque ordine dei `members` in ingresso | FR-003, FR-013 |
| G2 | Ogni importo proviene dallo `schedule`; nessuna percentuale o arrotondamento nel codice | FR-002 |
| G3 | Con `status: 'calculated'`, `totalCents` = somma degli `amountCents` + eventuale `acrPackage.amountCents` | FR-012 |
| G4 | Con `status: 'notCovered'` non è presente alcun importo | FR-010 |
| G5 | L'input non viene modificato | principio II |

## Esempio

Input: anno 2026, listino `SCHEDULE_2026_27`, componenti nati 1975-05-01, 2015-03-10, 2018-09-02.

Output:

```json
{
  "status": "calculated",
  "members": [
    { "memberId": "a", "age": 51, "band": "adulti", "fullCents": 2600, "benefit": "none", "amountCents": 2600 },
    { "memberId": "b", "age": 11, "band": "acr", "fullCents": 1500, "benefit": "inAcrPackage" },
    { "memberId": "c", "age": 8,  "band": "acr", "fullCents": 1500, "benefit": "inAcrPackage" }
  ],
  "acrPackage": { "amountCents": 2500, "memberIds": ["b", "c"] },
  "totalCents": 5100
}
```
