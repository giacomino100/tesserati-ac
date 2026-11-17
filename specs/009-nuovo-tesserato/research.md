# Research: Nuovo tesserato

## R1. Persona inserita a mano

- **Decision**: `persons/{id}` (ID generato) con `lastName`, `firstName`, `birthDate`, `identityKey`, `sex?`, `taxCode?`
  e, al posto di `createdInImport`, `createdManually: { year, at, by }` → in Firestore tre campi piatti
  `createdInYear`, `createdAt`, `createdBy`. Regola: si crea solo se nella stessa scrittura nasce la sua adesione
  `adhesions/{createdInYear}_{id}` con `origin: 'nuovo'` (`existsAfter`), come la persona importata nasce col suo segno.
- **Rationale**: nessuna persona "orfana"; stessi campi ammessi della 004 (constitution III).
- **Alternatives considered**: segno di import finto per l'iscrizione (mescola due concetti).

## R2. Adesione "nuovo"

- **Decision**: `adhesions/{anno}_{personId}` con `personId`, `associationYear`, `origin: 'nuovo'`, `list`, `sector`
  (coerente con `list`, come la 008), `addedAt`, `addedBy`. Regole: listino dell'anno esistente; persona esistente
  prima o dopo la scrittura; **nessuna adesione nell'anno precedente** (quella va riconfermata); `addedAt ==
  request.time`, `addedBy == ownEmail()`. Una sola per persona e anno (ID).
- **Rationale**: FR-004–FR-006, FR-010; stesso schema della riconferma.

## R3. Validazione del modulo

- **Decision**: `validateNewMember(input, year)` in `@tesseramento/import`: cognome e nome con `cleanText` + maiuscolo
  (come l'import); data "AAAA-MM-GG" (dal campo data del browser) valida, non successiva all'anno associativo e non
  più di 120 anni prima; sesso `M`/`F` o vuoto; codice fiscale maiuscolo, 16 caratteri alfanumerici, o vuoto. Errori
  per campo: "Inserisci il cognome.", "Inserisci il nome.", "Inserisci la data di nascita.", "Data di nascita non
  valida.", "Il codice fiscale ha 16 lettere e numeri.".
- **Rationale**: FR-002; pulizia identica all'import = stessa chiave di identità.

## R4. Ricerca in archivio

- **Decision**: `matchNewMember(member, year, archive, yearIds, previousYearIds)`:
  1. stesso codice fiscale o stessa chiave → `existing` (persona dell'archivio);
  2. altrimenti `findCandidates` (regole di §2) → `similar` con i candidati;
  3. altrimenti `new`.
  Per `existing` (e per il candidato scelto con "Stessa persona"): adesione nell'anno → `alreadyInYear`; nell'anno
  precedente → `renewable` (rimando a Riconferme); altrimenti si riusa, con l'ultima adesione per il messaggio.
- **Rationale**: FR-004 e chiarimento (dati identici = stessa persona, senza chiedere).

## R5. Scrittura

- **Decision**: `add(entry, email)` in una `runTransaction`: rilegge l'adesione dell'anno (esiste → `AlreadyEnrolledError`)
  e, per una persona esistente, l'adesione dell'anno precedente (esiste → `RenewableError`); poi `set` della persona
  (se nuova, ID con `doc(collection(...))`) e dell'adesione.
- **Rationale**: tutto o niente, fallisce offline; contemporaneità coperta da ID + transazione.

## R6. Annullare

- **Decision**: la regola `delete` della 008 vale per `origin in ['riconferma', 'nuovo']`; l'app riusa `undo` e
  `hasSavedFee` del backend delle riconferme. La persona resta.
- **Rationale**: FR-007; chiarimento (sezione in Riconferme).

## R7. Anni con tesserati, import, listini

- **Decision**: `memberYears()` e `schedule-usage` considerano `origin in ['riconferma', 'nuovo']`; `YearContext`
  dell'import passa `manualIds: Map<personId, 'riconferma' | 'nuovo'>` (sostituisce `renewedIds`); `planImport` salta con
  `alreadyRenewed` o `alreadyAdded` ("già presente nell'anno (inserita a mano)").
- **Rationale**: FR-008, FR-009.

## R8. Quote: anno prima del primo listino

- **Decision**: `FeesService` legge anche gli anni dei listini (`FEE_SCHEDULE_BACKEND.list()`); senza listino
  dell'anno, se l'anno è precedente al primo listino il testo è "Nessun listino 2025/26: le quote si calcolano solo
  negli anni con un listino.", altrimenti resta "Manca il listino … Crealo nella sezione Listini." (le regole della 003
  creano solo l'anno dopo uno esistente).
- **Rationale**: FR-011.
