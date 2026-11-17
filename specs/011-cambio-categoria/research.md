# Research: Cambio categoria per età

## R1. Dove sta l'elenco attuale

- **Decision**: campo `list` sull'adesione. Le riconferme e i nuovi tesserati lo hanno già; per un'adesione importata
  nasce al primo cambio. `listOfAdhesion(importId, list)` dà la **precedenza a `list`** (oggi la dà a `importId`); il
  segno di import resta com'è.
- **Rationale**: un solo modo di leggere l'elenco in tutte le pagine; nessuna migrazione.

## R2. Settore e settore dell'export

- **Decision**: a ogni cambio `sector = sectorOf(list)`; per un'adesione importata, al primo cambio il `sector` di prima
  (quello dell'export) si copia in `exportSector` e da lì non cambia più. Tesserati mostra la colonna **Elenco** (al
  posto di "Settore") e, se presente, il settore dell'export nel dettaglio della riga.
- **Rationale**: FR-006; settore sempre coerente con l'elenco per le pagine e i riepiloghi (012).

## R3. Ultimo cambio ed eccezione

- **Decision**: `listChange { from, at, by, note? }` (solo l'ultimo cambio). Eccezione = `listChange.note` presente.
  "Allinea" scrive `listChange` senza nota; "Cambia elenco" con nota (trim, 1–200 caratteri); "Togli eccezione" →
  elenco per età (con listino) o `listChange.from` (senza listino), senza nota.
- **Rationale**: FR-004–FR-006; YAGNI per lo storico completo.

## R4. Elenco per età

- **Decision**: `listForAge(birthDate, year, schedule)` in `@tesseramento/families`: `ageFor` + `bandForAge` +
  `listForBand`; sotto l'età minima → ACR; data non valida o età negativa → `undefined`. La vista delle riconferme
  (008) usa la stessa funzione.
- **Rationale**: una sola regola per riconferma, iscrizione e allineamento.

## R5. Stato e "Allinea tutte"

- **Decision**: `listStatus({ list, birthDate, exception }, year, schedule?)` → `{ kind: 'aligned' }` |
  `{ kind: 'misaligned', expected }` | `{ kind: 'exception', expected? }` | `{ kind: 'unknown' }` (senza listino o data
  non valida). `alignAllPlan(rows, year, schedule)` → le righe `misaligned` con l'elenco atteso.
- **Rationale**: FR-001–FR-003, FR-008.

## R6. Scrittura e regole

- **Decision**: `changeList(changes[], email)` in una `runTransaction` (aggiornamenti con `update`, a gruppi di 400 per
  stare sotto le 500 scritture). Regola `update`: `affectedKeys().hasOnly(['list', 'sector', 'exportSector',
  'listChange'])`, `list` valido, `sector == settore di list`, `listChange` con soli `from`, `at`, `by`, `note`,
  `from` valido, `at == request.time`, `by == ownEmail()`, `note` assente o testo 1–200 caratteri dopo il trim,
  `exportSector` invariato se c'era, altrimenti uguale al `sector` di prima (o assente). Nessuna lettura di altri
  documenti.
- **Rationale**: FR-007, FR-010; transazione = fallisce offline; vale l'ultimo salvataggio (edge case).

## R7. Riconferme

- **Decision**: `YearMember.exception?: true` (dal `listChange.note` dell'adesione); `renewalView` aggiunge
  l'avviso `{ kind: 'previousException', list }` → "L'anno scorso era un'eccezione: ACR".
- **Rationale**: FR-009 e chiarimento (le eccezioni si fanno solo in Tesserati).
