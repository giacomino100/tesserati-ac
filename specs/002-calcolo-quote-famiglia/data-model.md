# Data Model: Calcolo quota famiglia

**Feature**: [spec.md](./spec.md) · **Date**: 2026-11-16

Modello **in memoria** del pacchetto `@tesseramento/fees`: nessun dato viene salvato in questa
specifica. Identificatori in inglese (constitution), valori di dominio in italiano.
Importi sempre in **centesimi interi**.

## AgeBand (fascia)

`'acr' | 'giovanissimi' | 'giovani' | 'adulti'`

## FeeSchedule (listino di un anno associativo)

| Campo | Tipo | Regole | Valore 2026/27 |
|---|---|---|---|
| `associationYear` | intero | anno di inizio | `2026` |
| `label` | testo | | `"2026/27"` |
| `minAge` | intero | sotto questa età → non previsto | `6` |
| `bands` | lista di `BandFee` | fasce contigue, senza sovrapposizioni, la prima parte da `minAge`, l'ultima senza limite | vedi sotto |
| `acrPackageCents` | intero > 0 | pacchetto 2 ACR | `2500` |
| `maxHouseholdSize` | intero | oltre → non previsto | `4` |

**BandFee**

| Campo | Tipo | Regole |
|---|---|---|
| `band` | `AgeBand` | una sola volta per listino |
| `minAge` | intero | incluso |
| `maxAge` | intero o assente | incluso; assente = nessun limite |
| `fullCents` | intero > 0 | quota piena |
| `discountedCents` | intero > 0, ≤ `fullCents` | quota "Percentuale del 20%" del PDF, **non calcolata** |

| Fascia | minAge | maxAge | fullCents | discountedCents |
|---|---|---|---|---|
| acr | 6 | 14 | 1500 | 1200 |
| giovanissimi | 15 | 18 | 1600 | 1300 |
| giovani | 19 | 29 | 2200 | 1800 |
| adulti | 30 | — | 2600 | 2100 |

## HouseholdMember (componente)

| Campo | Tipo | Regole |
|---|---|---|
| `id` | testo | univoco nel nucleo |
| `lastName`, `firstName` | testo | usati solo per l'ordine stabile a parità di data |
| `birthDate` | `YYYY-MM-DD` | data valida, non successiva al 31/12 dell'anno associativo |

## HouseholdFeeInput

| Campo | Tipo | Regole |
|---|---|---|
| `associationYear` | intero | deve coincidere con `schedule.associationYear` |
| `members` | lista di `HouseholdMember` | può essere vuota (totale 0); id univoci |
| `schedule` | `FeeSchedule` | |

## HouseholdFeeResult (esito)

Unione su `status`:

### `calculated`
| Campo | Tipo | Note |
|---|---|---|
| `members` | lista di `MemberFeeLine` | ordine: dal più anziano al più giovane |
| `acrPackage` | `AcrPackageLine` o assente | presente solo se applicato |
| `totalCents` | intero | = somma di `amountCents` + `acrPackage.amountCents` |

**MemberFeeLine**: `memberId`, `age`, `band`, `fullCents`, `benefit`, `amountCents`
(assente se `benefit = 'inAcrPackage'`).

**Benefit**: `'none'` · `'discount20'` · `'free'` · `'inAcrPackage'`

**AcrPackageLine**: `amountCents` (dal listino), `memberIds` (i due ACR inclusi).

### `notCovered`
| Campo | Tipo | Note |
|---|---|---|
| `reasons` | lista di `NotCoveredReason` | almeno uno |
| `members` | lista di `{ memberId, age, band? }` | `band` assente sotto `minAge`; nessun importo |

**NotCoveredReason**: `'householdTooLarge'` (più di `maxHouseholdSize`) ·
`'memberUnderMinAge'` (almeno un componente sotto `minAge`).

### `invalidInput`
| Campo | Tipo | Note |
|---|---|---|
| `errors` | lista di `{ code, memberId? }` | `code`: `'scheduleYearMismatch'` · `'invalidBirthDate'` · `'birthDateAfterYear'` · `'duplicateMemberId'` |

## Regole di calcolo (da spec FR-004…FR-010)

Ordine dei componenti: data di nascita crescente (dal più anziano), poi cognome, nome, id.
Siano `n` i componenti e `r` gli ACR.

| Condizione | Esito |
|---|---|
| input non valido | `invalidInput` |
| `n > maxHouseholdSize` o qualcuno sotto `minAge` | `notCovered` (tutto il nucleo) |
| `n = 0` | `calculated`, totale 0 |
| `n = 1`, o `n = 2` con `r < 2` | quote piene |
| `n = 2`, `r = 2` | entrambi `inAcrPackage` + riga pacchetto |
| `n = 3`, `r < 2` | più giovane `discount20`, altri quota piena |
| `n = 3`, `r = 2` | i 2 ACR `inAcrPackage` + riga pacchetto, il terzo quota piena |
| `n = 3`, `r = 3` | i 2 più anziani `inAcrPackage` + riga pacchetto, il più giovane `discount20` |
| `n = 4` | 3° `discount20`, 4° `free`, primi due quota piena; nessun pacchetto |
