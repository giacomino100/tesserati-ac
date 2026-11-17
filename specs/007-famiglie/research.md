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
  l'indice con ID `{anno}_{personId}` garantisce una sola **appartenenza** per persona per anno. Le regole non possono
  però controllare tutte le liste `memberIds`: per questo **l'appartenenza è la fonte di verità** (R8).
- **Alternatives considered**: campo `familyId` sull'adesione (le adesioni sono immutabili per le regole della 004);
  un documento per anno con tutte le famiglie (regole non verificabili per singola famiglia).

## R3. Scritture

- **Decision**: `confirm(families[], email)` in una `runTransaction`: per ogni famiglia legge le appartenenze dei
  componenti; se una appartiene a un'altra famiglia → `MemberInOtherFamilyError(personId)`; poi scrive la famiglia
  (nuova o aggiornata), crea/aggiorna le appartenenze dei componenti e cancella quelle dei componenti tolti.
  `dissolve(familyId)`: transazione che cancella la famiglia e le sue appartenenze. "Conferma tutte" = una
  transazione **per gruppo di al massimo 8 famiglie**, in sequenza; si ferma al primo gruppo che non riesce e riporta
  quante famiglie sono state confermate.
- **Rationale**: ogni famiglia è tutto o niente; offline la transazione fallisce invece di restare in coda (come
  003–006). I gruppi servono per il limite di Firestore di **20 documenti letti dalle regole per richiesta**: ogni
  appartenenza legge (`getAfter`) la sua famiglia, quindi 8 famiglie + l'email autorizzata restano sotto il limite;
  con ~45 famiglie reali in un'unica transazione la richiesta verrebbe rifiutata.

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

## R8. Fonte di verità: l'appartenenza

- **Decision**: una persona sta nella famiglia indicata dalla sua `familyMemberships/{anno}_{personId}`. In lettura
  (`suggestFamilies` riceve anche le appartenenze dell'anno) i componenti effettivi di una famiglia sono i suoi
  `memberIds` che hanno un'appartenenza verso di lei; un `memberIds` senza appartenenza corrispondente è ignorato e la
  famiglia mostra l'avviso `inconsistent`; le appartenenze verso famiglie inesistenti sono ignorate.
- **Rationale**: è l'unico dato garantito unico dalle regole (ID); protegge da scritture parziali o da client non
  aggiornati.

## R7. Concorrenza

- **Decision**: famiglia suggerita confermata da due persone insieme: vale la **prima**; la seconda trova le
  appartenenze già create verso un'altra famiglia e fallisce con `MemberInOtherFamilyError`, la pagina si ricarica.
  Correzioni insieme della stessa famiglia confermata (stesso ID): vale l'ultima.
