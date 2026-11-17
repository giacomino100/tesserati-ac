# Contract: Firestore — import di tutti gli elenchi

Base: [contratto della 004](../../004-import-excel-acr/contracts/firestore-import.md). Qui solo le differenze.

## Regole

| Collezione | Create (differenze rispetto alla 004) |
|---|---|
| `importBatches/{id}` | `source in ['ACR', 'GIOVANI', 'ADULTI']` ∧ `id == string(associationYear) + '-' + source` |
| `adhesions/{id}` | `importId.matches(string(associationYear) + '-(ACR\|GIOVANI\|ADULTI)')` |
| `persons/{id}` | invariata |

Letture, `update`, `delete` invariati.

## Transazione di salvataggio

1. legge `importBatches/{Y}-{ELENCO}` → esiste: `AlreadyImportedError(elenco)`;
2. legge `feeSchedules/{Y}` → manca: `NoFeeScheduleError`;
3. legge `adhesions/{Y}_{personId}` di ogni persona riusata → una esiste: `ImportContextChangedError`;
4. crea segno, persone nuove, adesioni.

## Lettura del contesto dell'anno

`feeSchedules/{Y}`, `importBatches where associationYear == Y`, tutte le `persons`, `adhesions where
associationYear == Y` (in parallelo).

## Test sull'emulatore (aggiunte a `firebase/tests/rules.test.ts`)

| # | Caso | Atteso |
|---|---|---|
| I12 | Import completo Giovani e Adulti del 2026 (segno + persone + adesioni) | consentito |
| I13 | Giovani 2026 dopo ACR 2026, con una persona già esistente (solo adesione) | consentito |
| I14 | Secondo import Giovani 2026 | negato |
| I15 | Adesione del 2026 per una persona che ne ha già una (da ACR) | negato |
| I16 | `source` diverso dai tre, ID con elenco diverso dal `source`, `importId` con elenco sconosciuto | negato |

I1–I11 della 004 restano verdi.
