# Data Model: Famiglie

## In memoria (`@tesseramento/families`)

| Tipo | Campi |
|---|---|
| `YearMember` | `personId`, `lastName`, `firstName`, `birthDate` ("AAAA-MM-GG"), `list` (`'ACR' \| 'GIOVANI' \| 'ADULTI'`), `bond?` ("C3"), `bondId?` ("900002") |
| `ConfirmedFamily` | `id`, `associationYear`, `memberIds: string[]`, `origin: 'legame' \| 'manuale'`, `bondId?`, `confirmedAt: Date`, `confirmedBy` |
| `Bond` | `{ kind: string, size: number }` da `parseBond("C3")` |
| `FamilyWarning` | `{ kind: 'sizeMismatch', expected, found }` \| `{ kind: 'bondMismatch', bonds: string[] }` \| `{ kind: 'inconsistent', personIds }` (in `memberIds` ma senza appartenenza verso la famiglia) |
| `SuggestedFamily` | `bondId`, `members: YearMember[]` (esclusi quelli già in famiglie confermate), `bond?`, `warnings: FamilyWarning[]`, `confirmable` (≥ 2 componenti), `elsewhere: { member, familyId }[]` (stesso `N. Legame` ma già in un'altra famiglia confermata) |
| `ProposedAddition` | `familyId`, `member: YearMember` (stesso `N. Legame` di una famiglia confermata, ma fuori da ogni famiglia) |
| `YearFamilies` (esito di `suggestFamilies`) | `confirmed: ConfirmedFamilyView[]` (famiglia + componenti effettivi + avvisi), `suggested: SuggestedFamily[]`, `additions: ProposedAddition[]`, `withoutFamily: YearMember[]` |
| `FamilyIssue` (esito di `validateFamily`) | `{ kind: 'tooFew' }` \| `{ kind: 'notInYear', personId }` \| `{ kind: 'inOtherFamily', personId, familyId }` |

## In Firestore

### `families/{familyId}` (ID automatico)

| Campo | Tipo | Regole |
|---|---|---|
| `associationYear` | int | non cambia in modifica |
| `memberIds` | list di string | 2–20 elementi |
| `origin` | `'legame' \| 'manuale'` | |
| `bondId` | string | facoltativo (solo `legame`) |
| `confirmedAt` | timestamp | = `request.time` |
| `confirmedBy` | string | = email dell'utente in minuscolo |

Create, update (riconferma dopo correzione) e delete (scioglimento) solo per utenti autorizzati.

### `familyMemberships/{associationYear}_{personId}`

| Campo | Tipo | Regole |
|---|---|---|
| `associationYear` | int | = parte iniziale dell'ID |
| `personId` | string | = parte finale dell'ID |
| `familyId` | string | la famiglia, dopo la scrittura, esiste, è dello stesso anno e contiene `personId` |

Una sola per persona per anno (ID). Si cancella quando la persona esce dalla famiglia o la famiglia è sciolta.
**Fonte di verità** di chi sta in quale famiglia (research R8).

## Stati

```text
suggerita ──Conferma──▶ confermata ──Riapri/Correggi/Conferma──▶ confermata (aggiornata)
     ▲                       │
     └──────Sciogli──────────┘   (i componenti tornano suggeriti o senza famiglia)
```
