# Data Model: Tesserati semplificati

## In memoria (`@tesseramento/families`)

- **YearMember** + `paidOn?: string`, `familyOptOut?: true`.
- **MemberYearRow** = `{ member, status: 'pending' | 'enrolled', candidate?: RenewalCandidate (pending), origin?:
  'import' | 'riconferma' | 'nuovo', paidOn?, familyId?, undoable }`.
- **MemberYearView** = `{ rows, pendingCount, enrolledCount }`.
- **FamilyUpdate** = `{ kind: 'none' }` | `{ kind: 'add', familyId, memberIds }` | `{ kind: 'create', bondId, memberIds }`.
- **FamilyPanel** = `{ familyId?, bondId?, members: { member, status: 'pending' | 'enrolled', inFamily: boolean }[],
  addable: YearMember[] }`.

## In Firestore

| Collezione | Cambia | Regola |
|---|---|---|
| `adhesions/{anno}_{personId}` | + `paidOn` ("AAAA-MM-GG"), `paidAt`, `paidBy` (alla creazione di riconferme e nuovi, o con "Registra pagamento"); + `familyOptOut` (bool) | pagamento: `paidAt == request.time`, `paidBy == ownEmail()`, `paidOn` non futuro; aggiornamento solo dei tre campi o solo di `familyOptOut` |
| `allowedEmails/{email}` | + `admin: true` (solo console) | invariata (lettura del proprio documento) |
| `importBatches/{id}` | — | create solo se `isAdmin()` |

## Stati di una riga

`pending` → (Conferma) → `enrolled` con `paidOn`; `enrolled` senza `paidOn` → (Registra pagamento) → con `paidOn`;
`enrolled` (riconferma o nuovo, non in famiglia) → (Annulla conferma) → `pending` (o sparisce, se nuovo).
