# Data Model: Riconferma adesione

## In memoria (`@tesseramento/families`)

- **YearMember** + `origin?: 'import' | 'riconferma'` (assente = import, come prima).
- **RenewalWarning** = `{ kind: 'listChange', from: FamilyList, to: FamilyList }` | `{ kind: 'underMinAge', minAge }` |
  `{ kind: 'invalidBirthDate' }`.
- **RenewalCandidate** = `{ member: YearMember (anno precedente), age: number, list?: FamilyList (nuovo anno; assente
  se data non valida), warnings: RenewalWarning[], renewable: boolean }`.
- **RenewalGroup** = `{ bondId, bond?, candidates: RenewalCandidate[] }` (dal più anziano).
- **RenewedMember** = `{ member: YearMember (anno nuovo), origin: 'import' | 'riconferma', undoable: boolean,
  inFamily: boolean }`.
- **RenewalView** = `{ groups: RenewalGroup[], singles: RenewalCandidate[], renewed: RenewedMember[], pendingCount,
  renewedCount }`.
- **RenewalDraft** = `{ personId, associationYear, list, bond?, bondId? }`.

Funzioni (dettagli in [contracts/renewals-api.md](./contracts/renewals-api.md)): `listForBand`, `renewalView`,
`renewalDraft`.

## In memoria (`@tesseramento/import`)

- `listOfAdhesion(importId?, list?)`: elenco di un'adesione (importata o riconfermata).
- **SkipReason** + `alreadyRenewed`; `planImport(…, renewedIds?)`.

## In Firestore

| Collezione | Cambia | Regola |
|---|---|---|
| `adhesions/{anno}_{personId}` | nuova forma **riconferma**: `personId`, `associationYear`, `origin: 'riconferma'`, `list`, `sector`, `bond?`, `bondId?`, `renewedFrom`, `renewedAt`, `renewedBy` | create solo se esiste `adhesions/{renewedFrom}_{personId}`, `renewedFrom == associationYear − 1`, esiste `feeSchedules/{anno}`, `sector` coerente con `list`, chi/quando di chi scrive; delete solo per `origin == 'riconferma'` senza `familyMemberships/{anno}_{personId}` |

Le adesioni importate non cambiano (forma, regole, `update` vietato). Nessuna migrazione.

## Stati della pagina

`loading` → `noPrevious` ("Nessun tesserato nel … da riconfermare.") | `noSchedule` (elenco visibile, riconferma
disattivata) | `ready` (selezione) → `saving` → `ready` con messaggio, o `failed` / `partial` (gruppi salvati).
