# Feature Specification: Cambio categoria per età

**Feature Branch**: `011-cambio-categoria`

**Created**: 2026-11-17

**Status**: Draft

**Input**: Brief `docs/brief/011-cambio-categoria.md` (tutte le proposte approvate il 2026-11-17) — in Tesserati,
l'elenco (ACR, Giovani, Adulti) di ogni adesione con l'avviso quando non corrisponde all'età, l'allineamento all'età (una
o tutte) e le eccezioni decise a mano con nota.

**Regole di riferimento**: `docs/dominio/regole-famiglia.md` §3 (fascia solo dall'anno di nascita con le fasce del
PDF; elenco forzabile a mano con nota, l'eccezione vale un anno — aggiornato il 2026-11-17);
`docs/dominio/regole-quote.md` (la quota dipende solo dall'età, anche con elenco forzato — aggiornato il 2026-11-17);
specifiche 004–006, 008, 009, 010; constitution, principi I, III e IV.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Vedere chi non è nell'elenco della sua età (Priority: P1)

In "Tesserati" ogni riga mostra l'elenco dell'adesione e, se l'anno ha un listino e l'elenco non è quello dell'età,
l'avviso "Per età: Adulti". In cima la pagina dice quante adesioni non sono allineate.

**Why this priority**: è il punto di partenza: senza vedere le incoerenze non si può correggerle.

**Independent Test**: con i dati finti del 2026/27 importati non c'è nessuna adesione non allineata (l'export e il PDF
coincidono per tutte le età presenti); aggiungendo una persona inventata nata nel 1996 importata come Giovani,
compare "1 adesione non allineata all'età" e sulla sua riga "Per età: Adulti".

**Acceptance Scenarios**:

1. **Given** i dati finti del 2026/27, **When** si apre Tesserati, **Then** ogni riga mostra l'elenco (ACR, Giovani o
   Adulti) e non ci sono avvisi.
2. **Given** ROSSI ELENA nata nel 1996 nell'elenco Giovani del 2026/27, **When** si apre Tesserati, **Then** compaiono
   "1 adesione non allineata all'età" e, sulla sua riga, "Per età: Adulti".
3. **Given** un anno senza listino (es. 2025/26), **When** si apre Tesserati, **Then** non compare nessun avviso né
   l'allineamento, e il cambio a mano con nota resta possibile.

---

### User Story 2 - Allineare all'età (Priority: P1)

Sulla riga di un'adesione non allineata "Allinea all'età" cambia l'elenco in quello dell'età; "Allinea tutte" lo fa per
tutte le adesioni non allineate dell'anno (escluse le eccezioni con nota), dopo una conferma che dice quante cambieranno.

**Why this priority**: è la correzione più frequente (es. i trentenni messi nei Giovani dall'export).

**Independent Test**: con ROSSI ELENA e ROSSI LUCIA (entrambe nate nel 1996, Giovani), "Allinea tutte" chiede "2
adesioni cambieranno elenco. Confermi?" e, confermando, entrambe passano ad Adulti con l'elenco di prima conservato.

**Acceptance Scenarios**:

1. **Given** ROSSI ELENA non allineata, **When** si preme "Allinea all'età", **Then** il suo elenco diventa Adulti,
   l'avviso sparisce e restano l'elenco di prima (Giovani), la data e l'email.
2. **Given** 2 adesioni non allineate e 1 eccezione con nota, **When** si preme "Allinea tutte" e si conferma, **Then**
   cambiano solo le 2 adesioni; l'eccezione resta.
3. **Given** una connessione assente, **When** si allinea, **Then** compare "Impossibile salvare. Controlla la
   connessione e riprova. Non è stato salvato nulla." e niente cambia.
4. **Given** le quote del 2026/27 salvate, **When** si allinea un'adesione, **Then** nessuna quota cambia (la quota
   dipende solo dall'età).

---

### User Story 3 - Eccezione decisa a mano (Priority: P2)

Su qualsiasi riga "Cambia elenco" permette di scegliere un altro elenco con una nota obbligatoria (es. GRECO NICOLO, 15
anni, "resta in ACR un anno in più"). La riga mostra l'eccezione con la nota; "Togli eccezione" la riporta all'elenco
per età. L'anno dopo, la riconferma ricalcola comunque dall'età e avvisa "L'anno scorso era un'eccezione: ACR".

**Why this priority**: risolve il caso deciso dalla parrocchia; è meno frequente dell'allineamento.

**Independent Test**: GRECO NICOLO (15 anni, Giovani) forzato in ACR con nota: la riga mostra "ACR · eccezione: resta
in ACR un anno in più"; la quota 2026/27 resta quella da Giovanissimo; "Allinea tutte" non lo tocca.

**Acceptance Scenarios**:

1. **Given** GRECO NICOLO in Giovani, **When** si sceglie ACR senza nota, **Then** compare "Scrivi una nota che spieghi
   l'eccezione." e niente cambia.
2. **Given** ACR con la nota "resta in ACR un anno in più", **When** si salva, **Then** la riga mostra "ACR · eccezione:
   resta in ACR un anno in più" con data ed email, e non è contata tra le non allineate.
3. **Given** l'eccezione, **When** si preme "Togli eccezione" (con listino), **Then** l'elenco torna Giovani e la nota
   sparisce.
4. **Given** l'eccezione del 2026/27, **When** in Riconferme si apre il 2027/28, **Then** GRECO NICOLO ha l'elenco per
   età (Giovani) e l'avviso "L'anno scorso era un'eccezione: ACR".
5. **Given** l'eccezione, **When** si calcolano le quote, **Then** GRECO NICOLO paga da Giovanissimo, come dice il PDF.

---

### Edge Cases

- Adesione con un elenco forzato uguale a quello dell'età: è un'eccezione inutile; si salva comunque (con nota) ma
  l'app non la segnala come non allineata.
- Persona sotto l'età minima del listino: l'elenco per età è ACR (come 008/009); se è già ACR non c'è avviso.
- Cambio di elenco di un'adesione in una famiglia confermata: permesso; famiglie e quote non cambiano.
- Due utenti cambiano la stessa adesione quasi insieme: vale l'ultimo salvataggio.
- Il settore originale dell'export (per le adesioni importate) resta leggibile anche dopo il cambio.
- Utente non autorizzato: nessun accesso.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Tesserati MUST mostrare per ogni adesione l'elenco (ACR, Giovani, Adulti); con il listino dell'anno, se
  l'elenco non è quello dell'età (fasce del listino: ACR; Giovanissimi e Giovani → Giovani; Adulti; sotto l'età
  minima → ACR) e l'adesione non è un'eccezione, MUST mostrare "Per età: {elenco}" e contarla in cima ("N adesioni non
  allineate all'età").
- **FR-002**: "Allinea all'età" MUST cambiare l'elenco (e il settore corrispondente) dell'adesione in quello dell'età.
- **FR-003**: "Allinea tutte" MUST, dopo una conferma con il numero di adesioni, allineare tutte le adesioni non
  allineate dell'anno, escluse le eccezioni; tutto o niente per ogni gruppo di salvataggio.
- **FR-004**: "Cambia elenco" MUST permettere di scegliere un altro elenco con una nota obbligatoria (testo non vuoto,
  al massimo 200 caratteri); l'adesione diventa un'eccezione mostrata con la nota.
- **FR-005**: "Togli eccezione" MUST riportare l'elenco a quello dell'età (con il listino) o all'elenco precedente
  all'eccezione (senza listino).
- **FR-006**: Ogni cambio MUST conservare l'elenco di prima, la data e l'email di chi cambia; per le adesioni importate
  il settore originale dell'export MUST restare leggibile.
- **FR-007**: Un cambio di elenco MUST NOT modificare persone, famiglie, quote o altri campi dell'adesione.
- **FR-008**: Senza listino dell'anno MUST NOT esserci avvisi né allineamento; il cambio a mano con nota resta.
- **FR-009**: In Riconferme, una persona con un'eccezione l'anno precedente MUST avere l'elenco per età e l'avviso
  "L'anno scorso era un'eccezione: {elenco}".
- **FR-010**: Solo gli utenti autorizzati MUST poter cambiare l'elenco; le regole di sicurezza MUST permettere di
  cambiare solo elenco, settore coerente e dati del cambio (elenco di prima, data, email, nota), con data ed email di chi
  salva.
- **FR-011**: Con i dati finti del 2026/27 MUST risultare 0 adesioni non allineate.

### Key Entities *(include if feature involves data)*

- **Adesione** (esistente): elenco e settore attuali; per le importate il settore dell'export; ultimo cambio di elenco
  (elenco di prima, data, email, nota se eccezione).
- **Listino dell'anno**: fasce ed età minima (003).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Allineare tutte le adesioni non allineate di un anno richiede 2 azioni ("Allinea tutte" + conferma).
- **SC-002**: Dopo "Allinea tutte", 0 adesioni non allineate (escluse le eccezioni).
- **SC-003**: 0 eccezioni salvate senza nota.
- **SC-004**: 0 quote cambiate da un cambio di elenco (verificato con test).
- **SC-005**: Gli utenti non autorizzati non riescono mai a cambiare un elenco (test delle regole).

## Assumptions

- L'elenco serve all'organizzazione e ai riepiloghi (012); le quote non lo usano.
- Gli anni con poche centinaia di adesioni si allineano in pochi gruppi di salvataggio.
- Riepiloghi ed export (012), regole delle quote e anagrafiche sono fuori ambito.
