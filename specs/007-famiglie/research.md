# Research: Famiglie

## R1. Dove sta la logica

- **Decision**: nuovo pacchetto puro `@tesseramento/families` (nessuna dipendenza di runtime) con raggruppamento,
  avvisi e validazione. Test anche sui file finti, leggendoli con `@tesseramento/import` e SheetJS solo come
  devDependencies.
- **Rationale**: logica con molti casi (aggiunte proposte, esclusione dei già confermati, avvisi); la 010 (quote nella
  famiglia) la riuserà insieme a `@tesseramento/fees`.
- **Alternatives considered**: nell'app (meno riusabile); dentro `@tesseramento/import` (non è import).

## R2. Modello in Firestore

- **Decision**: `families/{id automatico}` = `{ associationYear, memberIds: string[] (2..20), origin: 'legame' |
  'manuale', bondId?, confirmedAt, confirmedBy }`; `familyMemberships/{anno}_{personId}` = `{ associationYear,
  personId, familyId }`.
- **Rationale**: un documento per famiglia permette alle regole di controllare "almeno 2 componenti" e chi/quando;
  l'indice con ID `{anno}_{personId}` garantisce per costruzione una sola famiglia per persona per anno.
- **Alternatives considered**: campo `familyId` sull'adesione (le adesioni sono immutabili per le regole della 004);
  un documento per anno con tutte le famiglie (regole non verificabili per singola famiglia).

## R3. Scritture

- **Decision**: `confirm(families[], email)` in una `runTransaction`: per ogni famiglia legge le appartenenze dei
  componenti; se una appartiene a un'altra famiglia → `MemberInOtherFamilyError(personId)`; poi scrive la famiglia
  (nuova o aggiornata), crea/aggiorna le appartenenze dei componenti e cancella quelle dei componenti tolti.
  `dissolve(familyId)`: transazione che cancella la famiglia e le sue appartenenze. "Conferma tutte" = una sola
  transazione con tutte le famiglie suggerite valide (≈ 45 famiglie + ≈ 100 appartenenze < 500).
- **Rationale**: tutto o niente; offline la transazione fallisce invece di restare in coda (come 003–006).

## R4. Regole

- **Decision**:
  - `families`: get/list `isAllowed()`; create/update con forma esatta, `memberIds is list`, `size() >= 2 && <= 20`,
    `origin in ['legame','manuale']`, `bondId` stringa facoltativa, `associationYear is int`, `confirmedAt ==
    request.time`, `confirmedBy == ownEmail()`, update senza cambiare `associationYear`; delete `isAllowed()`.
  - `familyMemberships/{id}`: get/list `isAllowed()`; create/update se `id == string(anno) + '_' + personId` e
    `getAfter(families/{familyId})` ha lo stesso anno e contiene `personId`; delete se dopo la scrittura la famiglia
    indicata non esiste più o non contiene più la persona.
- **Rationale**: integrità garantita dal server; letture nelle regole limitate a un documento famiglia per scrittura.
- **Alternatives considered**: Cloud Function di controllo (vietata senza necessità, principio V).

## R5. Tesserati dell'anno

- **Decision**: `yearMembers(year)` = adesioni dell'anno (`where associationYear == anno`) unite alle persone
  (`persons`), con elenco (da `importId`), `Legame`, `N. Legame`; `confirmedFamilies(year)` = `families where
  associationYear == anno`.
- **Rationale**: stesse letture della pagina Tesserati (004), nessun indice composito.

## R6. Avvisi sul `Legame`

- **Decision**: `parseBond("C3")` → `{ kind: 'C', size: 3 }` (lettera + numero, spazi tolti, altrimenti
  `undefined`); avviso `sizeMismatch` se `size` ≠ componenti trovati (contando anche i componenti già in famiglie
  confermate con lo stesso `N. Legame`), `bondMismatch` se i componenti hanno `Legame` diversi.
- **Rationale**: `regole-famiglia.md` §0: il numero del `Legame` coincide con i componenti tesserati.

## R7. Concorrenza

- **Decision**: vale l'ultima conferma (transazione): una famiglia confermata da due persone insieme non si duplica
  perché la seconda trova le appartenenze già create e, se la famiglia è la stessa (stesso ID), la aggiorna; se
  sono due famiglie nuove con gli stessi componenti la seconda fallisce con `MemberInOtherFamilyError` e la pagina
  si ricarica.
