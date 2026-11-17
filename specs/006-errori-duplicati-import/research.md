# Research: Errori e duplicati nell'import

## R1. Somiglianza dei nomi

- **Decision**: distanza di Levenshtein (inserimenti, cancellazioni, sostituzioni) sul nome normalizzato come nella
  chiave di identità (maiuscolo, senza accenti, spazi singoli); simile se distanza ≤ 2 **oppure** uno è contenuto
  nell'altro come sequenza di parole intere all'inizio o in fondo ("MARIA" in "MARIA GRAZIA", "GRAZIA" in "MARIA
  GRAZIA"). Nomi identici non sono "simili" (sarebbero corrispondenza esatta).
- **Rationale**: `regole-famiglia.md` §2 ("al massimo 2 lettere", "uno contiene l'altro"); le parole intere evitano
  che "ANNA" sia "contenuta" in "GIOVANNA".
- **Alternatives considered**: Jaro-Winkler o soundex (soglie meno spiegabili alla segreteria); librerie esterne
  (vietate senza necessità, principio V).

## R2. Somiglianza delle date

- **Decision**: date "AAAA-MM-GG" diverse tra loro, simili se (a) le 8 cifre differiscono in una sola posizione, e
  la data è valida; oppure (b) giorno e mese scambiati (`AAAA-GG-MM` dell'altra), con giorno ≠ mese.
- **Rationale**: i refusi tipici di battitura e il formato americano.

## R3. Chi è candidato

- **Decision**: per ogni riga senza corrispondenza esatta di chiave né di codice fiscale: candidati = persone in
  archivio con (stessa data ∧ stesso cognome ∧ nome simile) ∨ (stesso cognome ∧ stesso nome ∧ data simile).
  Confronti sulle parti normalizzate ricavate da cognome, nome e data della persona salvata. Le persone create
  dallo stesso import non sono candidati (non sono in archivio).
- **Rationale**: FR-001; nessun confronto riga-riga dentro il file (assunzione della spec).

## R4. Codice fiscale

- **Decision**: indice `taxCode → personId` dell'archivio; una riga con codice fiscale valido presente nell'indice
  è attribuita a quella persona prima di qualsiasi altro controllo (anche se la chiave corrisponde a un'altra
  persona); `TaxCodeMatch { row, personId, sameKey }` per la segnalazione. Nello stesso file, una seconda riga con
  lo stesso codice fiscale è saltata come `duplicate` (in `parseAdhesionSheet`, come la chiave).
- **Rationale**: `regole-famiglia.md` §2, FR-005, FR-006.

## R5. Scelte dell'utente

- **Decision**: `planImport(..., decisions: ReadonlyMap<rowNumber, personId | 'new'>)`. Ogni possibile doppione
  senza scelta resta in `plan.pendingDuplicates` e non entra né tra le persone nuove né tra le riusate; "Importa" è
  possibile solo con `pendingDuplicates.length === 0`. "Stessa persona" → come una persona riusata (o
  `alreadyInYear` se ha già un'adesione nell'anno); due righe sulla stessa persona → la seconda `duplicate`.
- **Rationale**: FR-003, FR-004; il piano si ricalcola a ogni scelta (funzione pura, istantanea).

## R6. Righe saltate con nome

- **Decision**: `SkippedRow.lastName?`, `firstName?` (testi puliti, se presenti) aggiunti da `parseAdhesionSheet`;
  solo in memoria, mai salvati: il segno di import salva solo il conteggio.
- **Rationale**: FR-007, FR-010.

## R7. Avvisi età/settore

- **Decision**: in `apps/web/src/app/importa/age-warnings.ts`: età con `ageFor` del pacchetto `fees`; sotto
  `schedule.minAge` → `belowMinimumAge`; altrimenti fascia con `bandForAge` e gruppo atteso
  `acr → RAGAZZI`, `giovanissimi | giovani → GIOVANI`, `adulti → ADULTI`; settore dell'export diverso →
  `sectorMismatch` con età e settore atteso. `ageFor` e `bandForAge` diventano esportazioni di `@tesseramento/fees`.
- **Rationale**: FR-008; le età vengono dal listino dell'anno (principio I), non da costanti nel codice.

## R8. Contesto dell'anno

- **Decision**: `YearContext` aggiunge `feeSchedule` (il listino dell'anno, già letto) e `archive: ArchivedPerson[]`
  (`id, lastName, firstName, birthDate, identityKey, taxCode?, lastAdhesion?: { year, list }`). L'ultima adesione
  si ricava leggendo tutte le adesioni (poche centinaia).
- **Rationale**: FR-002 (dati della persona già presente) e FR-008.
