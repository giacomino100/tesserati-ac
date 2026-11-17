# Contract: aggiunte a `@tesseramento/families`

Il pacchetto ottiene la dipendenza `@tesseramento/fees` (pura). Nessun accesso a rete, browser, data corrente o log.

```ts
export function householdsOfYear(families: YearFamilies): HouseholdsOfYear;
export function householdFees(households: readonly Household[], schedule: FeeSchedule): HouseholdFee[];
export function compareWithSaved(
  current: readonly HouseholdFee[],
  saved: readonly SavedHouseholdFee[],
): FeeComparison[];
export function yearTotals(comparisons: readonly FeeComparison[]): YearTotals;
/** Istantanea da salvare per un nucleo calcolato. */
export function toSavedCalculated(fee: HouseholdFee, associationYear: number): Omit<SavedHouseholdFee, 'savedAt' | 'savedBy'>;
```

## Garanzie verificate dai test

| # | Caso | Atteso |
|---|---|---|
| H1 | Tre file finti, 9 famiglie confermate | 19 nuclei: 9 famiglie + 10 singoli; `unconfirmedSuggested` 0 |
| H2 | Tre file finti senza famiglie confermate | 37 nuclei da 1; `unconfirmedSuggested` 9 |
| H3 | H1 calcolato con `SCHEDULE_2026_27` | 17 `calculated` per 56500 centesimi; `900004` `notCovered` `householdTooLarge`; GATTI MIA `memberUnderMinAge` |
| H4 | I 29 esempi di `regole-quote.md` come famiglie confermate (con il listino serializzato come in archivio) | stessi totali degli esempi (SC-001) |
| H5 | `compareWithSaved`: nessun salvato | tutti `new` |
| H6 | Salvato uguale | `unchanged` |
| H7 | Listino diverso (quota Adulti) | `changed` per i nuclei con adulti, `unchanged` gli altri |
| H8 | Famiglia salvata e poi un componente tolto | `changed`; il componente tolto è un nuovo nucleo `new` |
| H9 | Quota manuale salvata, stessi componenti | `unchanged`, `needsManual` false |
| H10 | Quota manuale salvata, componenti cambiati | `changed`, `needsManual` true se ancora non previsto |
| H11 | Nucleo salvato che non esiste più | `removed` |
| H12 | `yearTotals` | somma solo calcolati e manuali valide; `missing` = non previsti senza quota |
