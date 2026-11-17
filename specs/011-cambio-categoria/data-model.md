# Data Model: Cambio categoria per età

## In memoria (`@tesseramento/families`)

- **YearMember** + `exception?: true` (l'adesione dell'anno è un'eccezione con nota).
- **ListStatus** = `{ kind: 'aligned' }` | `{ kind: 'misaligned', expected: FamilyList }` |
  `{ kind: 'exception', expected?: FamilyList }` | `{ kind: 'unknown' }`.
- **RenewalWarning** + `{ kind: 'previousException', list: FamilyList }`.
- Funzioni: `listForAge(birthDate, year, schedule)`, `listStatus(row, year, schedule?)`, `alignAllPlan(rows, year,
  schedule)` (dettagli in [contracts/categories-api.md](./contracts/categories-api.md)).

## In memoria (`@tesseramento/import`)

- `listOfAdhesion(importId?, list?)`: `list` valido ha la precedenza, poi il segno di import.

## In Firestore

| Collezione | Cambia | Regola |
|---|---|---|
| `adhesions/{anno}_{personId}` | + `list` (anche per le importate), `sector` coerente, `exportSector?` (settore dell'export, solo importate, copiato al primo cambio), `listChange { from, at, by, note? }` | `update` solo di questi campi, `at == request.time`, `by == ownEmail()`, nota 1–200 caratteri se presente, `exportSector` mai cambiato una volta scritto |

## App (`MemberRow` di Tesserati)

`adhesionId`, `personId`, `lastName`, `firstName`, `birthDate`, `list`, `sector`, `exportSector?`, `exportAgeBand?`,
`bond?`, `bondId?`, `listChange?` (`from`, `at`, `by`, `note?`).

## Stati della riga

`aligned` → (Cambia elenco + nota) → `exception`; `misaligned` → (Allinea / Allinea tutte) → `aligned`;
`exception` → (Togli eccezione) → `aligned` (con listino) o elenco precedente (senza listino).
