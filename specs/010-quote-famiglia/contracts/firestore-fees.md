# Contract: Firestore — quote dei nuclei

Forma: [../data-model.md](../data-model.md). Base: `isAllowed()` della 001.

## Matrice di accesso

| Collezione | get / list | create / update | delete |
|---|---|---|---|
| `householdFees/{id}` | `isAllowed()` | `isAllowed()` ∧ campi ammessi ∧ `id == string(associationYear) + '_' + householdKey` ∧ `householdKey.matches('(f\|p)-.+')` ∧ `memberIds` lista 1–20 ∧ `kind in ['calculated','manual']` ∧ `totalCents is int && >= 0` ∧ (manual ⇒ `manualCents == totalCents`, `note` testo non vuoto, `reason in ['householdTooLarge','memberUnderMinAge','invalidInput']`, niente `lines`) ∧ (calculated ⇒ `lines is list`, niente `note`/`manualCents`) ∧ `savedAt == request.time` ∧ `savedBy == email` | `isAllowed()` |

## Scritture dell'app

- **save(entries, removedKeys, email)**: `runTransaction` con soli `set` (quote) e `delete` (nuclei non più presenti).

## Lettura

`householdFees where associationYear == Y`.

## Test sull'emulatore (`firebase/tests/rules.test.ts`)

| # | Caso | Atteso |
|---|---|---|
| K1 | Non autorizzato: lettura/scrittura | negato |
| K2 | Autorizzato: lettura | consentito |
| K3 | Quota calcolata valida; quota manuale valida (anche 0) | consentito |
| K4 | Manuale senza nota o con nota vuota, `manualCents` ≠ `totalCents`, motivo sconosciuto | negato |
| K5 | Totale negativo o non intero, `kind` sconosciuto, campo in più, ID incoerente | negato |
| K6 | `savedBy` di un altro o `savedAt` del client | negato |
| K7 | Aggiornamento e cancellazione da autorizzato | consentito |
| K8 | 120 quote in una sola scrittura | consentito |
