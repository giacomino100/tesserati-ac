# Data Model: Quote nella famiglia

## In memoria (`@tesseramento/families`)

| Tipo | Campi |
|---|---|
| `Household` | `key` (`f-{familyId}` \| `p-{personId}`), `familyId?`, `members: YearMember[]` (dal più anziano) |
| `HouseholdsOfYear` | `households: Household[]`, `unconfirmedSuggested: number` (famiglie suggerite con almeno 2 componenti non confermate) |
| `HouseholdFee` | `household`, `result` = esito di `calculateHouseholdFee` (`calculated` \| `notCovered` \| `invalidInput`) |
| `SavedHouseholdFee` | `key`, `associationYear`, `memberIds`, `kind: 'calculated' \| 'manual'`, `lines?`, `acrPackageCents?`, `manualCents?`, `note?`, `reason?`, `totalCents`, `savedAt`, `savedBy` |
| `FeeComparison` | `key`, `status: 'new' \| 'unchanged' \| 'changed' \| 'removed'`, `current?: HouseholdFee`, `saved?: SavedHouseholdFee`, `needsManual: boolean` (non previsto senza quota manuale valida) |
| `YearTotals` | `totalCents` (calcolati + manuali validi), `calculated`, `manual`, `missing` (non previsti senza quota), `toUpdate` (`changed` + `new` + `removed`) |

`NotCoveredReason` → testo: `householdTooLarge` "il nucleo ha più di 4 persone"; `memberUnderMinAge` "c'è un
componente sotto i 6 anni"; `invalidInput` "data di nascita incoerente con l'anno".

## In Firestore

### `householdFees/{associationYear}_{householdKey}`

| Campo | Tipo | Regole |
|---|---|---|
| `associationYear` | int | = parte iniziale dell'ID |
| `householdKey` | string | `f-…` o `p-…`, = parte finale dell'ID |
| `memberIds` | list di string | 1–20 |
| `kind` | `'calculated' \| 'manual'` | |
| `lines` | list di mappe | solo `calculated`: `memberId`, `age`, `band`, `fullCents`, `benefit`, `amountCents?` |
| `acrPackageCents` | int | facoltativo (`calculated`) |
| `manualCents` | int ≥ 0 | solo `manual`, = `totalCents` |
| `note` | string non vuota | solo `manual` |
| `reason` | string | solo `manual`: `householdTooLarge` \| `memberUnderMinAge` \| `invalidInput` |
| `totalCents` | int ≥ 0 | |
| `savedAt` | timestamp | = `request.time` |
| `savedBy` | string | = email dell'utente in minuscolo |

Create, update (aggiorna) e delete (nucleo non più presente) solo per utenti autorizzati.

## Stati di un nucleo nella pagina

```text
calcolabile ─ non salvato ("new") ─Salva─▶ salvato ("unchanged") ─(listino/famiglia/tesserati cambiano)─▶ "changed" ─Aggiorna─▶ "unchanged"
non previsto ─ da decidere ─Quota manuale + nota─▶ salvato (manuale) ─(componenti cambiano)─▶ da decidere
```
