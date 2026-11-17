# Feature Specification: Import Excel ACR

**Feature Branch**: `004-import-excel-acr`

**Created**: 2026-11-17

**Status**: Draft

**Input**: Brief `docs/brief/004-import-excel-acr.md` (decisioni di revisione approvate il 2026-11-17) — dall'app
gli utenti autorizzati caricano l'Excel `ElencoAdesioni_ACR.xlsx`, vedono un'anteprima e, dopo la conferma,
salvano i tesserati e le loro adesioni dell'anno.

**Regole di riferimento**: `docs/dominio/excel-esempio/README.md` (struttura del file, colonne, difetti);
`docs/dominio/glossario.md`; `docs/dominio/regole-famiglia.md` §0 e §2; constitution, principi III e IV.

## Clarifications

### Session 2026-11-17

- Q: Se nel file ci sono righe con nome, cognome o data di nascita mancanti, oppure due righe della stessa persona, cosa deve fare l'import? → A: si importano le righe valide, quelle errate vengono saltate e sono elencate (numero di riga e motivo) in anteprima e nel riepilogo finale; per i duplicati si importa la prima riga e si saltano le successive.

- Q: Se il file ha colonne extra o in ordine diverso rispetto alle 33 attese, l'import deve procedere? → A: sì, le colonne necessarie sono cercate per nome; ordine ed extra sono ignorati; si rifiuta solo se ne manca una necessaria.

- Q: Se l'anno del file non ha un listino, l'import deve procedere? → A: no, è rifiutato con il messaggio di creare prima il listino di quell'anno nella sezione "Listini".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Caricare il file e vedere l'anteprima (Priority: P1)

Un utente autorizzato apre la sezione di import, sceglie il file Excel dell'ACR e vede subito un'anteprima: anno
associativo letto dal file, numero di righe, e un elenco delle prime righe con nome, data di nascita, fascia e
legame. Finché non conferma, nulla viene salvato.

**Why this priority**: è il cuore della funzione e dà alla segreteria la possibilità di controllare il file prima
di scrivere dati.

**Independent Test**: caricare il file finto dell'ACR e verificare che l'anteprima mostri "2026", 89 righe e le
prime righe; annullare e verificare che non sia stato salvato nulla.

**Acceptance Scenarios**:

1. **Given** un utente autorizzato e il file ACR finto, **When** sceglie il file, **Then** vede l'anno 2026, 89
   righe e le prime righe con nome, data di nascita, fascia e legame.
2. **Given** l'anteprima mostrata, **When** l'utente annulla, **Then** non viene salvato alcun tesserato né alcuna
   adesione.
3. **Given** un file con spazi in più, celle vuote o stringhe `''` nei testi, **When** viene letto, **Then**
   l'anteprima mostra i testi puliti e i valori vuoti come vuoti.

---

### User Story 2 - Confermare e salvare tesserati e adesioni (Priority: P1)

Dall'anteprima l'utente conferma. L'app salva, per ogni riga, la persona (anagrafica che resta valida negli anni)
e la sua adesione dell'anno. A fine import mostra quante persone e quante adesioni sono state salvate.

**Why this priority**: senza il salvataggio i dati restano solo nell'Excel e non si possono fare riconferme,
famiglie e quote.

**Independent Test**: con il file ACR finto confermare l'import e verificare 89 adesioni per il 2026 e il numero
di persone mostrato; ripetere con un'altra persona autorizzata e verificare che i dati siano visibili.

**Acceptance Scenarios**:

1. **Given** l'anteprima del file ACR finto, **When** l'utente conferma, **Then** vengono salvate 89 adesioni
   dell'anno 2026 e il numero di persone e di adesioni è mostrato a fine import.
2. **Given** una persona che compare in un anno con adesione, **When** in un anno successivo si importa un altro
   file con la stessa persona, **Then** l'anagrafica resta una sola e si aggiunge solo l'adesione del nuovo anno.
3. **Given** l'import in corso, **When** il salvataggio fallisce (es. connessione assente), **Then** l'utente vede
   un messaggio chiaro e non resta un import a metà senza che lo sappia.

---

### User Story 3 - Rifiutare file non validi e riimporti (Priority: P2)

Se il file non è un Excel valido, non ha il foglio atteso, mancano colonne necessarie o ne ha di rinominate,
l'import è rifiutato con un messaggio che dice cosa non va (quali colonne mancano). Se per l'anno del file
esistono già adesioni importate, l'import è rifiutato con un messaggio.

**Why this priority**: protegge da file sbagliati e da duplicazioni, ma l'uso normale (US1 e US2) viene prima.

**Independent Test**: caricare un file con una colonna rinominata, un file non Excel e di nuovo il file già
importato; in tutti i casi nulla viene salvato e il messaggio è chiaro.

**Acceptance Scenarios**:

1. **Given** un file senza la colonna `Data Nascita`, **When** viene caricato, **Then** l'import è rifiutato e il
   messaggio nomina la colonna mancante.
2. **Given** un file che non è un Excel (o con foglio diverso da quello atteso), **When** viene caricato,
   **Then** viene rifiutato con un messaggio chiaro.
3. **Given** un file con anno 2030 e nessun listino per quell'anno, **When** viene caricato, **Then** l'import è
   rifiutato con il messaggio di creare prima il listino.
4. **Given** l'anno 2026 con adesioni già importate, **When** si carica di nuovo il file del 2026, **Then**
   l'import è rifiutato con un messaggio e i dati esistenti restano invariati.

---

### Edge Cases

- `Anno Associativo` non nella forma `Anno AAAA`, o righe con anni diversi nello stesso file: rifiutato con messaggio.
- File senza righe di dati: rifiutato con messaggio.
- Righe con nome, cognome o data di nascita mancanti: la riga è saltata, il resto del file viene importato; numero
  di riga e motivo sono elencati in anteprima e nel riepilogo finale (la revisione e la correzione delle righe
  saltate sono della specifica 006).
- Settore diverso da `RAGAZZI` o età fuori dall'ACR (es. oltre i 14): la riga viene importata comunque, il settore è
  quello dell'export; la verifica spetta alla specifica 006.
- `N. Legame` vuoto: nessun legame; `N. Legame` presente: salvato così com'è, senza raggruppare in famiglie.
- Codice fiscale assente (quasi sempre per i minori): ammesso, non è mai obbligatorio.
- Due righe con lo stesso cognome, nome e data di nascita (normalizzati) nello stesso file: si importa la prima, le
  successive sono saltate ed elencate come duplicate (trattamento completo nella specifica 006).
- File in cui tutte le righe sono da saltare: nessun dato salvato e messaggio chiaro, come per un file senza righe.
- Utente non autorizzato: non vede la sezione né può leggere o scrivere i dati.
- Il file non viene mai inviato fuori dal dispositivo e nessun dato personale compare nei log.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Gli utenti autorizzati MUST poter scegliere un file Excel dell'ACR dalla sezione di import dell'app.
- **FR-002**: Il sistema MUST leggere il file sul dispositivo dell'utente, senza inviarlo altrove, e MUST NOT
  scrivere dati personali nei log.
- **FR-003**: Il sistema MUST mostrare, prima di qualsiasi salvataggio, un'anteprima con anno associativo, numero
  di righe e prime righe (nome, data di nascita, fascia, legame).
- **FR-004**: Se l'utente annulla, il sistema MUST NOT salvare alcun dato.
- **FR-005**: Il sistema MUST ricavare l'anno associativo dalla colonna `Anno Associativo` (`Anno 2026` → 2026).
- **FR-018**: Se per l'anno del file non esiste un listino, il sistema MUST rifiutare l'import con un messaggio che
  invita a creare prima il listino di quell'anno nella sezione "Listini"; nulla viene salvato.
- **FR-006**: Il sistema MUST cercare per nome le colonne necessarie, a prescindere dall'ordine, e ignorare le
  colonne in più; se manca una colonna necessaria o il foglio atteso, MUST rifiutare l'import indicando quali
  colonne mancano.
- **FR-007**: Il sistema MUST pulire i testi (spazi iniziali, finali e doppi), trattare celle vuote e stringa `''`
  come valore vuoto e normalizzare cognome e nome per riconoscere la persona.
- **FR-008**: Il sistema MUST leggere e salvare solo le colonne necessarie: cognome, nome, sesso, data di nascita,
  codice fiscale (se presente), settore, fasce d'età dell'export, legame, N. legame, anno associativo.
  Le altre colonne (Frazione, SR, LM, A–E, Incarico, Pagato, MLAC, MSAC, indirizzo, contatti, ecc.) MUST NOT essere
  né salvate né mostrate.
- **FR-009**: Dopo la conferma, per ogni riga il sistema MUST salvare la persona (anagrafica condivisa tra gli
  anni, riconosciuta da cognome + nome + data di nascita normalizzati) e la sua adesione dell'anno.
- **FR-010**: Se una persona esiste già da un anno precedente, il sistema MUST riusarla e aggiungere solo
  l'adesione del nuovo anno, senza duplicarla.
- **FR-011**: Se l'anno del file ha già adesioni importate, il sistema MUST rifiutare l'import con un messaggio e
  lasciare i dati invariati.
- **FR-012**: Il sistema MUST importare anche le righe fuori dall'età ACR, con il settore indicato dall'export.
- **FR-013**: A fine import il sistema MUST mostrare il numero di persone e di adesioni salvate e l'elenco delle
  righe saltate (numero di riga e motivo).
- **FR-017**: Il sistema MUST saltare le righe senza cognome, nome o data di nascita e le righe duplicate (stessa
  identità di una riga precedente), importare le altre ed elencare le righe saltate già in anteprima, con il
  numero di righe che verranno importate.
- **FR-014**: Un import MUST essere tutto-o-niente per l'anno: se il salvataggio non riesce, non resta un anno
  parzialmente importato.
- **FR-015**: Solo gli utenti autorizzati MUST poter leggere e scrivere tesserati e adesioni; tutti gli altri MUST
  essere rifiutati.
- **FR-016**: Con i dati finti di `docs/dominio/excel-esempio/` l'import dell'ACR MUST dare 89 adesioni dell'anno 2026.

### Key Entities *(include if feature involves data)*

- **Tesserato (persona)**: anagrafica condivisa tra gli anni; cognome e nome normalizzati, data di nascita, sesso,
  codice fiscale (se presente). Identità = cognome + nome + data di nascita normalizzati.
- **Adesione**: la persona in un anno associativo; anno, settore e fascia d'età dell'export, legame e N. legame.
  Una per persona per anno.
- **Anno di import**: anno associativo con le sue adesioni; se esiste già, non si riimporta.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con il file ACR finto l'anteprima mostra anno 2026 e 89 righe entro 5 secondi dalla scelta del file.
- **SC-002**: Dopo la conferma risultano 89 adesioni 2026 e il totale di persone coincide con quello mostrato.
- **SC-003**: Annullando dall'anteprima, 0 dati vengono salvati (verificabile dall'elenco dopo l'annullamento).
- **SC-004**: Il 100% dei file con colonne mancanti o non Excel viene rifiutato con un messaggio che indica il
  problema, senza salvare nulla.
- **SC-008**: Con un file che contiene righe senza data di nascita o duplicate, il 100% di queste righe è elencato
  (riga e motivo) e le altre righe sono importate.
- **SC-005**: Riimportando lo stesso anno, 0 adesioni vengono aggiunte o modificate.
- **SC-006**: Nessun dato personale compare nei log e nessun file lascia il dispositivo.
- **SC-007**: Gli utenti non autorizzati non riescono mai a leggere o scrivere tesserati e adesioni (verificato dai
  test delle regole di sicurezza).

## Assumptions

- Gli utenti sono la segreteria già autorizzata dalla specifica 001; l'import si fa una volta all'anno.
- Il file ha la struttura descritta in `docs/dominio/excel-esempio/README.md` (un foglio, 33 colonne, intestazioni
  nella prima riga).
- Il codice fiscale è salvato solo se presente e non serve come chiave; indirizzi e contatti si aggiungeranno con
  una specifica che ne abbia bisogno.
- `Pagato` e le colonne `MLAC`/`MSAC` non si salvano; il pagamento non è ancora una funzione dell'app.
- Nel file ACR non ci sono duplicati con la chiave cognome + nome + data di nascita (verificato sull'export 2026);
  in 004 i duplicati sono solo saltati ed elencati; i casi dubbi (nomi simili) e la loro revisione sono della 006.
- Import di Giovani e Adulti (005), famiglie (007), riconferma e quote (008–010) sono fuori ambito.
