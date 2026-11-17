# Data Model: Nuovo tesserato

## In memoria (`@tesseramento/import`)

- **NewMemberInput** = `{ lastName, firstName, birthDate ("AAAA-MM-GG" o ""), sex ("" | "M" | "F"), taxCode }` (testi del
  modulo).
- **NewMember** = `{ lastName, firstName, birthDate, identityKey, sex?, taxCode? }` (puliti).
- **NewMemberErrors** = `{ lastName?, firstName?, birthDate?, taxCode? }` (testi italiani).
- **NewMemberMatch** =
  `{ kind: 'new' }` |
  `{ kind: 'existing', person: ArchivedPerson, by: 'identity' | 'taxCode' }` |
  `{ kind: 'similar', candidates: ArchivedPerson[] }` |
  `{ kind: 'renewable', person, previousYear }` |
  `{ kind: 'alreadyInYear', person }`.
- **SkipReason** + `alreadyAdded`; `planImport(…, manualIds?: Map<personId, 'riconferma' | 'nuovo'>)`.

## In memoria (`@tesseramento/families`)

- **YearMember.origin**: `'import' | 'riconferma' | 'nuovo'`.

## In Firestore

| Collezione | Cambia | Regola |
|---|---|---|
| `persons/{id}` | forma **manuale**: `lastName`, `firstName`, `birthDate`, `identityKey`, `sex?`, `taxCode?`, `createdInYear`, `createdAt`, `createdBy` | create solo con `existsAfter(adhesions/{createdInYear}_{id})` di origine "nuovo", `createdAt == request.time`, `createdBy == ownEmail()`; update/delete vietati |
| `adhesions/{anno}_{personId}` | origine **nuovo**: `personId`, `associationYear`, `origin: 'nuovo'`, `list`, `sector`, `addedAt`, `addedBy` | listino dell'anno esistente; persona esistente (prima o dopo); nessuna adesione nell'anno precedente; chi/quando; delete come le riconferme |

Nessuna migrazione.

## Stati del modulo

`closed` → `editing` (campi + errori + età/elenco) → `checked` (esito della ricerca: nuova / esistente / simile da
decidere / rimando / già iscritta) → `saving` → `saved` (messaggio, modulo chiuso) | `failed` (messaggio, modulo aperto).
