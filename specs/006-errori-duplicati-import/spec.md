# Feature Specification: Errori e duplicati nell'import

**Feature Branch**: `006-errori-duplicati-import`

**Created**: 2026-11-17

**Status**: Draft

**Input**: Brief `docs/brief/006-errori-duplicati-import.md` (decisioni di revisione approvate il 2026-11-17) —
l'anteprima dell'import segnala righe saltate con cognome e nome, persone riconosciute dal codice fiscale,
possibili doppioni da decidere a mano e avvisi su età e settore.

**Regole di riferimento**: `docs/dominio/regole-famiglia.md` §2 (identità, codice fiscale, casi dubbi — aggiornato
il 2026-11-17) e §3 (età e fasce); `docs/dominio/regole-quote.md` (età = anno associativo − anno di nascita; fasce
del PDF: ACR 6–14, Giovanissimi 15–18, Giovani 19–29, Adulti 30 e oltre; sotto i 6 anni non previsto);
specifiche 004 e 005; constitution, principi I, III e IV.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Decidere i possibili doppioni (Priority: P1)

Durante l'anteprima, l'app confronta ogni riga che non corrisponde esattamente a nessuna persona in archivio con le
persone già presenti. Se trova una persona simile (stesso cognome e data con nome quasi uguale, oppure stesso
cognome e nome con data quasi uguale), la riga compare tra i **possibili doppioni** accanto ai dati della persona
già presente. Per ognuna l'utente sceglie "Stessa persona" o "Persona diversa"; finché non ha deciso tutto, non può
importare.

**Why this priority**: un refuso nel nome o nella data trasformerebbe una persona dell'anno scorso in una nuova,
rompendo riconferma e famiglie.

**Independent Test**: in archivio c'è ROSSI MARIA nata il 12/03/1965; si importa un file con ROSSI MARIA GRAZIA
nata il 12/03/1965: l'anteprima la mostra tra i possibili doppioni; con "Stessa persona" l'adesione va a ROSSI
MARIA (nessuna persona nuova), con "Persona diversa" si crea una persona nuova.

**Acceptance Scenarios**:

1. **Given** in archivio ROSSI MARIA 12/03/1965, **When** si importa una riga ROSSI MARIA GRAZIA 12/03/1965,
   **Then** l'anteprima mostra il possibile doppione con i dati di entrambe e "Importa" è disattivato.
2. **Given** il possibile doppione del caso 1, **When** l'utente sceglie "Stessa persona" e importa, **Then**
   l'adesione dell'anno viene aggiunta a ROSSI MARIA e non si crea una persona nuova; l'anagrafica salvata non cambia.
3. **Given** il possibile doppione del caso 1, **When** l'utente sceglie "Persona diversa" e importa, **Then** si
   crea una persona nuova ROSSI MARIA GRAZIA.
4. **Given** in archivio BIANCHI LUCA 05/11/1982, **When** si importa BIANCHI LUCA 11/05/1982 (giorno e mese
   scambiati) o 05/11/1983 (una cifra diversa), **Then** la riga compare tra i possibili doppioni.
5. **Given** una riga uguale a una persona in archivio (stessa chiave della 004), **When** si apre l'anteprima,
   **Then** non è un possibile doppione: la persona è riusata come in 004.

---

### User Story 2 - Riconoscere la persona dal codice fiscale (Priority: P1)

Se una riga ha un codice fiscale uguale a quello di una persona già in archivio, è quella persona anche se nome o
data sono scritti diversamente. L'anteprima lo segnala ("riconosciuta dal codice fiscale").

**Why this priority**: è la regola di identità più affidabile del dominio quando il dato c'è (regole-famiglia §2).

**Independent Test**: in archivio NERI ANNA 05/11/1982 con codice fiscale; si importa NERI ANA con lo stesso codice
fiscale: nessun doppione da decidere, l'adesione va a NERI ANNA e l'anteprima lo segnala.

**Acceptance Scenarios**:

1. **Given** in archivio una persona con codice fiscale X, **When** si importa una riga con codice fiscale X e nome
   diverso, **Then** la riga è attribuita a quella persona, l'anteprima mostra "Riga N: riconosciuta dal codice
   fiscale come …" e l'anagrafica salvata non cambia.
2. **Given** una riga che corrisponde per cognome, nome e data alla persona A ma ha il codice fiscale della persona
   B, **When** si apre l'anteprima, **Then** vale il codice fiscale: la riga è attribuita a B ed è segnalata.
3. **Given** due righe dello stesso file con lo stesso codice fiscale, **When** si apre l'anteprima, **Then** la
   seconda è saltata come doppione della prima.

---

### User Story 3 - Righe saltate leggibili e avvisi su età e settore (Priority: P2)

Le righe saltate mostrano anche cognome e nome (se presenti), per ritrovarle nel file. Le righe la cui età non
corrisponde al settore secondo il PDF, o che sono sotto i 6 anni, compaiono tra gli **avvisi** e vengono importate
comunque con i dati dell'export.

**Why this priority**: aiuta a correggere il file e prepara le quote (010), ma non blocca nulla.

**Independent Test**: con il file ACR finto l'anteprima mostra 1 avviso ("GATTI MIA: 4 anni, sotto l'età minima di
6 anni del listino") e importa comunque le 15 righe.

**Acceptance Scenarios**:

1. **Given** una riga senza data di nascita con cognome PROVA e nome ALFA, **When** si apre l'anteprima, **Then**
   compare "Riga 7 (PROVA ALFA): manca la data di nascita".
2. **Given** il file ACR finto, **When** si apre l'anteprima, **Then** compare 1 avviso per GATTI MIA (4 anni,
   sotto l'età minima di 6) e 15 righe sono da importare.
3. **Given** una riga del 2026 nata nel 1996 con settore `GIOVANI`, **When** si apre l'anteprima, **Then** compare
   l'avviso "30 anni: per il listino è un Adulto, nell'export è GIOVANI" e la riga è importata come `GIOVANI`.

---

### Edge Cases

- Una riga simile a più persone in archivio: compaiono tutte come candidati; l'utente sceglie una di loro o "Persona
  diversa".
- Scelta "Stessa persona" verso una persona che ha già un'adesione nell'anno da un altro elenco: la riga è saltata
  come "già importata" (regola della 005) e l'anteprima lo mostra subito.
- Due righe dello stesso file indicate come "Stessa persona" della stessa persona in archivio: la seconda è saltata
  come doppione.
- Codice fiscale presente nella riga ma assente in archivio (o viceversa): vale la chiave cognome + nome + data e la
  ricerca dei possibili doppioni.
- Codice fiscale non valido (non 16 caratteri): ignorato come in 004.
- Annullando l'anteprima le scelte sui doppioni si perdono; ricaricando il file vanno rifatte.
- Righe simili tra loro dentro lo stesso file (non uguali): non vengono confrontate tra loro, solo con l'archivio.
- Nessun nome o dato personale nei log; i nomi si vedono solo a schermo dagli utenti autorizzati.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Prima del salvataggio il sistema MUST cercare, per ogni riga senza corrispondenza esatta né per codice
  fiscale, le persone in archivio simili secondo `regole-famiglia.md` §2: stessa data di nascita e stesso cognome con
  nome che differisce di al massimo 2 lettere o contenuto nell'altro; oppure stesso cognome e nome con data che
  differisce per una sola cifra o per giorno e mese scambiati (confronto su testi normalizzati).
- **FR-002**: L'anteprima MUST mostrare ogni possibile doppione con i dati della riga e della persona già presente
  (cognome, nome, data di nascita, ultimo elenco e anno) e le scelte "Stessa persona" (per ogni candidato) e
  "Persona diversa", senza scelta predefinita.
- **FR-003**: Il sistema MUST impedire l'import finché ogni possibile doppione non ha una scelta.
- **FR-004**: "Stessa persona" MUST attribuire l'adesione alla persona scelta senza modificarne l'anagrafica;
  "Persona diversa" MUST creare una persona nuova.
- **FR-005**: Se il codice fiscale valido di una riga è uguale a quello di una persona in archivio, il sistema MUST
  attribuire la riga a quella persona, anche se nome o data differiscono o se la chiave corrisponde a un'altra
  persona, e MUST segnalarlo in anteprima e nel riepilogo.
- **FR-006**: Due righe dello stesso file con lo stesso codice fiscale valido MUST essere trattate come doppione: la
  seconda è saltata.
- **FR-007**: Ogni riga saltata MUST essere mostrata con numero di riga, motivo e, se presenti, cognome e nome.
- **FR-008**: Il sistema MUST segnalare come avviso, senza bloccare l'import, le righe con età (anno associativo −
  anno di nascita) sotto i 6 anni o il cui settore dell'export non corrisponde al gruppo del listino (6–14 →
  `RAGAZZI`, 15–29 → `GIOVANI`, 30 e oltre → `ADULTI`); le righe si importano con i dati dell'export.
- **FR-009**: Il riepilogo finale MUST indicare anche quante righe sono state attribuite dal codice fiscale, quanti
  doppioni sono stati confermati come stessa persona e quanti avvisi c'erano.
- **FR-010**: Nomi e altri dati personali MUST comparire solo a schermo e MUST NOT essere scritti nei log né salvati
  oltre a quanto già previsto dalla 004 (nessun nuovo campo salvato).
- **FR-011**: Con i dati finti di `docs/dominio/excel-esempio/` MUST esserci 0 possibili doppioni e, sull'ACR,
  1 avviso (GATTI MIA, 4 anni); i risultati degli import (15, 8, 14 adesioni) non cambiano.

### Key Entities *(include if feature involves data)*

- **Possibile doppione**: una riga del file, uno o più candidati in archivio, la scelta dell'utente (nessuna, stessa
  persona X, persona diversa). Vive solo durante l'anteprima.
- **Avviso**: una riga, l'età calcolata, il motivo (sotto i 6 anni; settore dell'export diverso dal gruppo del
  listino). Non salvato.
- **Tesserato**, **Adesione**, **Import**: come 004/005, nessun campo nuovo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Il 100% delle righe che rientrano nella definizione di caso dubbio compare tra i possibili doppioni
  (verificato con almeno un esempio per ciascun criterio: nome con 1 e 2 lettere diverse, nome contenuto, una cifra
  della data, giorno e mese scambiati).
- **SC-002**: 0 import vengono salvati con un possibile doppione senza scelta.
- **SC-003**: Con "Stessa persona" il numero di persone in archivio non aumenta per quella riga; con "Persona diversa"
  aumenta di 1.
- **SC-004**: Il 100% delle righe con codice fiscale già in archivio è attribuito alla persona di quel codice fiscale.
- **SC-005**: Con il file ACR finto: 0 doppioni, 1 avviso, 15 adesioni importate.
- **SC-006**: Nessun dato personale nei log (verificato come in 004).

## Assumptions

- Le persone in archivio sono poche centinaia: il confronto con tutte è fattibile durante l'anteprima.
- "Nome che differisce di al massimo 2 lettere" = al massimo 2 inserimenti, cancellazioni o sostituzioni di lettere
  sul nome normalizzato (maiuscolo, senza accenti, spazi singoli).
- Le righe simili tra loro dentro lo stesso file non vengono confrontate (nel reale non ci sono duplicati di chiave).
- Gli avvisi usano le età del listino dell'anno (età minima e fasce), che sono quelle del PDF.
- Correggere o unire persone già salvate, annullare un import, famiglie e quote sono fuori ambito.
