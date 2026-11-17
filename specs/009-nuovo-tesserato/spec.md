# Feature Specification: Nuovo tesserato

**Feature Branch**: `009-nuovo-tesserato`

**Created**: 2026-11-17

**Status**: Draft

**Input**: Brief `docs/brief/009-nuovo-tesserato.md` (tutte le proposte approvate il 2026-11-17) — un modulo "Nuovo
tesserato" per iscrivere in un anno chi non era iscritto l'anno precedente, senza duplicare persone già in archivio.

**Regole di riferimento**: `docs/dominio/glossario.md` (Nuova adesione, anche chi torna dopo 2+ anni);
`docs/dominio/regole-famiglia.md` §1 (il nuovo tesserato entra senza famiglia e lo collega a mano la segreteria in
"Famiglie" — aggiornato il 2026-11-17), §2 (stessa persona: chiave cognome + nome + data, codice fiscale che prevale,
casi dubbi da far decidere), §3 (elenco dall'età con le fasce del listino); `docs/dominio/excel-esempio/README.md`
(colonne ammesse); specifiche 004–006, 007, 008, 010; constitution, principi I, III e IV.

## Clarifications

### Session 2026-11-17

- Q: Dove si trova "Annulla iscrizione" per le persone iscritte con il modulo? → A: in Riconferme, nella sezione "Nuovi tesserati del {anno}" con l'elenco degli iscritti a mano e "Annulla iscrizione" su ciascuno.
- Q: Con cognome, nome e data identici a una persona in archivio, si usa sempre quella o si può scegliere "Persona diversa"? → A: sempre quella persona, senza chiedere, come nell'import (la chiave identifica la persona, §2).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Iscrivere una persona nuova (Priority: P1)

Un utente autorizzato, in "Riconferme" o in "Tesserati", sceglie l'anno e preme "Nuovo tesserato". Compila cognome,
nome e data di nascita (sesso e codice fiscale se li conosce) e vede subito l'età e l'elenco dell'anno. Con "Iscrivi"
nasce la persona e la sua adesione dell'anno; la persona compare in Tesserati, tra i "Senza famiglia" in Famiglie e
in Quote.

**Why this priority**: è lo scopo della specifica: chi si iscrive per la prima volta non ha altro modo di entrare.

**Independent Test**: con i dati finti del 2026/27 importati, iscrivere "BIANCO LUCA" nato il 10/05/2019: il 2026/27 ha
38 tesserati, BIANCO LUCA è ACR (7 anni), senza famiglia, e in Quote è un nucleo da 1.

**Acceptance Scenarios**:

1. **Given** l'anno 2026/27 con il suo listino, **When** si compila "BIANCO", "LUCA", "10/05/2019", **Then** il modulo
   mostra "7 anni · ACR" e "Iscrivi" è attivo.
2. **Given** il modulo compilato, **When** si preme "Iscrivi", **Then** compare "Iscrizione salvata: BIANCO LUCA nel 2026/27." e la
   persona ha un'adesione 2026/27 con origine "nuovo", data ed email.
3. **Given** campi mancanti o non validi (cognome vuoto, data inesistente, data futura, codice fiscale non di 16
   caratteri), **When** si prova a iscrivere, **Then** compare l'errore accanto al campo e nulla viene salvato.
4. **Given** una bambina nata nel 2022, **When** si compila il modulo per il 2026/27, **Then** compare "4 anni · ACR"
   con l'avviso "Sotto l'età minima del listino (6 anni): quota non prevista" e si può iscrivere.
5. **Given** un anno senza listino, **When** si apre il modulo, **Then** compare "Manca il listino 2027/28. Crealo
   nella sezione Listini." e non si può iscrivere.
6. **Given** nessuna connessione, **When** si iscrive, **Then** compare "Impossibile salvare. Controlla la connessione
   e riprova. Non è stato salvato nulla."

---

### User Story 2 - Non duplicare chi è già in archivio (Priority: P1)

Prima di iscrivere, l'app cerca la persona in archivio con le regole di §2. Se la trova uguale (stessa chiave o stesso
codice fiscale) usa quella; se trova una persona simile chiede "Stessa persona" / "Persona diversa"; se la persona ha
già un'adesione nell'anno precedente rimanda a "Riconferme"; se è già iscritta nell'anno lo dice.

**Why this priority**: una persona duplicata rompe famiglie, riconferme e quote degli anni successivi.

**Independent Test**: con i dati finti del 2026/27 e un listino 2027/28, inserire "ROSSI MARIO" nato il 12/03/1965
nel 2027/28: l'app dice "Ha un'adesione nel 2026/27: usa Riconferme." e non salva nulla.

**Acceptance Scenarios**:

1. **Given** una persona in archivio con ultima adesione nel 2023/24, **When** si inseriscono gli stessi cognome, nome e
   data, **Then** compare "Già in archivio: ultima adesione nel 2023/24. Verrà usata questa persona." e l'iscrizione
   non crea una persona nuova.
2. **Given** una persona in archivio con codice fiscale e un nome scritto diversamente, **When** si inserisce lo stesso
   codice fiscale, **Then** l'app usa quella persona e mostra il nome e la data in archivio.
3. **Given** "ROSSI MARIO" del 12/03/1965 in archivio, **When** si inserisce "ROSSI MARIO" del 21/03/1965, **Then**
   compare il possibile doppione con "Stessa persona" / "Persona diversa" e "Iscrivi" resta disattivato finché non si
   sceglie.
4. **Given** una persona con adesione nell'anno precedente, **When** la si inserisce, **Then** compare "Ha un'adesione
   nel 2025/26: usa Riconferme." con il collegamento e non si può iscrivere.
5. **Given** una persona già iscritta nell'anno, **When** la si inserisce (o due utenti la iscrivono insieme),
   **Then** compare "Ha già un'adesione nel 2026/27." / la seconda iscrizione è rifiutata e non nasce una seconda adesione.

---

### User Story 3 - Annullare un'iscrizione e importare dopo (Priority: P2)

In "Riconferme" la sezione "Nuovi tesserati del 2026/27" elenca gli iscritti a mano dell'anno; da lì l'utente può
annullare un'iscrizione fatta per errore ("Annulla iscrizione"), finché la persona non è in una famiglia
confermata dell'anno; la persona resta in archivio. Se poi si importa l'Excel dello stesso anno che la contiene, la
riga è saltata come "già presente nell'anno (inserita a mano)". Nella pagina Quote, un anno senza listino (es. 2025/26)
non invita più a creare un listino che non si può creare.

**Why this priority**: corregge gli errori senza la console; l'import successivo non deve creare doppie adesioni.

**Independent Test**: iscrivere BIANCO LUCA e annullare: il 2026/27 torna a 37 tesserati e BIANCO LUCA resta in
archivio senza adesioni.

**Acceptance Scenarios**:

1. **Given** BIANCO LUCA iscritto, **When** in Riconferme 2026/27, sezione "Nuovi tesserati del 2026/27", si preme
   "Annulla iscrizione" e si conferma, **Then** la sua adesione
   sparisce e compare "Iscrizione annullata."; con una quota salvata del suo nucleo la conferma avvisa "La quota salvata
   del suo nucleo andrà ricalcolata in Quote.".
2. **Given** BIANCO LUCA aggiunto a una famiglia confermata, **When** si guarda la sua riga, **Then** "Annulla
   iscrizione" non c'è e compare "Prima togli questa persona dalla famiglia del 2026/27.".
3. **Given** BIANCO LUCA iscritto a mano, **When** si importa un Excel dello stesso anno che lo contiene, **Then** la
   riga è saltata come "già presente nell'anno (inserita a mano)".
4. **Given** il 2025/26 senza listino, **When** si apre "Quote" 2025/26, **Then** compare "Nessun listino 2025/26: le
   quote si calcolano solo negli anni con un listino." senza l'invito a crearlo.

---

### Edge Cases

- Spazi in più, minuscole e accenti nei nomi: puliti come nell'import (maiuscolo, spazi singoli) prima di cercare e
  salvare.
- Codice fiscale di un'altra persona dell'archivio con nome e data diversi: vale il codice fiscale (§2) e l'app lo
  mostra chiaramente prima di iscrivere.
- Data di nascita successiva all'anno o più di 120 anni prima: rifiutata con "Data di nascita non valida".
- Persona in archivio senza alcuna adesione (iscrizione annullata): riusata come le altre.
- Stessi cognome, nome e data di una persona in archivio: è sempre quella persona (come nell'import); "Stessa persona" /
  "Persona diversa" si chiede solo per i casi simili di §2, non per i dati identici.
- La persona iscritta a mano non ha `N. Legame`: le famiglie suggerite non la includono.
- Utente non autorizzato: nessun accesso.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Gli utenti autorizzati MUST poter aprire il modulo "Nuovo tesserato" da "Riconferme" e da "Tesserati"
  per l'anno scelto.
- **FR-002**: Il modulo MUST chiedere cognome, nome e data di nascita (obbligatori), sesso e codice fiscale
  (facoltativi, codice fiscale di 16 caratteri) e nient'altro.
- **FR-003**: Il modulo MUST mostrare età ed elenco dell'anno (fasce del listino dell'anno: ACR, Giovanissimi e
  Giovani → Giovani, Adulti; sotto l'età minima → ACR con avviso); senza listino dell'anno MUST NOT permettere
  l'iscrizione.
- **FR-004**: Prima di iscrivere, l'app MUST cercare la persona in archivio con le regole di `regole-famiglia.md` §2:
  stessa chiave o stesso codice fiscale → si usa sempre quella persona, senza chiedere; persona simile → scelta obbligatoria "Stessa persona"
  / "Persona diversa"; adesione nell'anno precedente → rimando a "Riconferme" e nessuna iscrizione; adesione nell'anno →
  nessuna iscrizione.
- **FR-005**: "Iscrivi" MUST creare, insieme o per niente, la persona (se nuova, con i soli dati del modulo puliti) e
  l'adesione dell'anno con origine "nuovo", elenco, settore, data ed email; MUST NOT modificare persone esistenti.
- **FR-006**: Una persona MUST avere al massimo un'adesione per anno, anche con due iscrizioni contemporanee.
- **FR-007**: La pagina "Riconferme" MUST mostrare la sezione "Nuovi tesserati del {anno}" con gli iscritti a mano
  dell'anno; da lì "Annulla iscrizione" (con conferma) MUST cancellare solo adesioni con origine "nuovo" di persone non in
  una famiglia confermata dell'anno, avvisando se il nucleo ha una quota salvata; la persona MUST restare in archivio.
- **FR-008**: L'import MUST saltare le righe delle persone iscritte a mano nell'anno, con il motivo "già presente
  nell'anno (inserita a mano)".
- **FR-009**: Le persone iscritte MUST comparire in Tesserati, Famiglie ("Senza famiglia") e Quote come le altre.
- **FR-010**: Solo gli utenti autorizzati MUST poter iscrivere e annullare; le regole di sicurezza MUST impedire
  persone con campi diversi da quelli ammessi, adesioni "nuovo" senza listino dell'anno, con elenco e settore
  incoerenti, con data o email non di chi salva, e annullamenti di adesioni di altra origine.
- **FR-011**: La pagina Quote di un anno senza listino MUST dire "Nessun listino {anno}: le quote si calcolano solo negli
  anni con un listino." quando quel listino non si può creare (anno precedente al primo listino), e mantenere l'invito a
  crearlo negli altri casi.

### Key Entities *(include if feature involves data)*

- **Persona** (esistente, 004–006): cognome, nome, data di nascita, sesso?, codice fiscale?; per le persone create dal
  modulo, l'indicazione che sono state inserite a mano (anno, data ed email), al posto del segno di import.
- **Adesione "nuovo"**: adesione dell'anno con origine "nuovo", elenco, settore, data ed email di chi iscrive.
- **Listino dell'anno**: quello della 003, letto per fasce ed età minima.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Iscrivere una persona nuova richiede al massimo 5 campi e 1 conferma, in meno di 1 minuto.
- **SC-002**: 0 persone duplicate quando si reinserisce una persona già in archivio con la stessa chiave o lo stesso
  codice fiscale (verificato con test).
- **SC-003**: 0 persone con due adesioni nello stesso anno, anche con iscrizioni contemporanee o import successivo.
- **SC-004**: 100% delle iscrizioni con l'elenco previsto dalle fasce del PDF.
- **SC-005**: Gli utenti non autorizzati non riescono mai a iscrivere o annullare (test delle regole).

## Assumptions

- Le persone in archivio sono poche centinaia: la ricerca dei simili si fa su tutto l'archivio, come nell'import (006).
- Il collegamento a una famiglia si fa in "Famiglie" (007, "Correggi"); il modulo non lo chiede.
- Modificare o cancellare anagrafiche, il cambio di elenco forzato (011) e riepiloghi/export (012) sono fuori ambito.
