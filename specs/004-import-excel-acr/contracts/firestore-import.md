# Contract: Firestore — import, persone, adesioni

**Feature**: [../spec.md](../spec.md) · Forma dei documenti: [../data-model.md](../data-model.md) ·
Base: regole della 001 (`isAllowed()`) e della 003 (`feeSchedules`).

## Scrittura dell'import (una transazione)

1. legge `importBatches/{Y}-ACR` → se esiste: errore `alreadyImported`;
2. legge `feeSchedules/{Y}` → se non esiste: errore `noFeeSchedule`;
3. crea `importBatches/{Y}-ACR`, ogni persona nuova (`persons/{id automatico}`, `createdInImport = '{Y}-ACR'`)
   e ogni adesione `adhesions/{Y}_{personId}` (`importId = '{Y}-ACR'`).

Le persone esistenti (riconosciute da `identityKey`, lette prima con una query su `persons`) non vengono scritte.

## Matrice di accesso delle regole

| Collezione | get / list | create | update | delete |
|---|---|---|---|---|
| `importBatches/{id}` | `isAllowed()` | `isAllowed()` ∧ `id == string(associationYear) + '-ACR'` ∧ `source == 'ACR'` ∧ campi esattamente quelli del data model ∧ conteggi interi validi ∧ `importedAt == request.time` ∧ `importedBy == email` ∧ `exists(feeSchedules/{associationYear})` | no | no |
| `persons/{id}` | `isAllowed()` | `isAllowed()` ∧ campi ammessi (obbligatori + opzionali) ∧ tipi e formato data ∧ `!exists(importBatches/{createdInImport})` ∧ `existsAfter(importBatches/{createdInImport})` | no | no |
| `adhesions/{id}` | `isAllowed()` | `isAllowed()` ∧ `id == string(associationYear) + '_' + personId` ∧ `importId == string(associationYear) + '-ACR'` ∧ campi ammessi ∧ `!exists(importBatches/{importId})` ∧ `existsAfter(importBatches/{importId})` | no | no |

Le regole leggono solo documenti condivisi da tutta la transazione (email autorizzata, segno di import,
listino), per restare nel limite di chiamate `exists/get` per richiesta.

## Test sull'emulatore (`firebase/tests/rules.test.ts`)

| # | Caso | Atteso |
|---|---|---|
| I1 | Non autenticato / non in elenco legge o scrive le tre collezioni | negato |
| I2 | Autorizzato legge le tre collezioni | consentito |
| I3 | Import completo (segno + 15 persone + 15 adesioni) in una scrittura | consentito |
| I4 | Import completo di 89 adesioni + 89 persone + segno | consentito (limiti delle regole rispettati) |
| I5 | Secondo import dello stesso anno | negato, nulla cambia |
| I6 | Import di un anno senza listino | negato |
| I7 | Persona o adesione scritte da sole (senza nuovo segno) | negato |
| I8 | Campo in più (es. `address`, `paid`, `mlac`) o tipo errato | negato |
| I9 | ID adesione o `importId` incoerenti con anno e persona | negato |
| I10 | Modifica o cancellazione di segno, persona, adesione | negato |
| I11 | `importedBy` diverso dall'utente o `importedAt` diverso da `request.time` | negato |
