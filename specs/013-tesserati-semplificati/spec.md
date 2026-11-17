# Feature Specification: Tesserati semplificati

**Feature Branch**: `013-tesserati-semplificati`

**Created**: 2026-11-17

**Status**: Draft

**Input**: Brief `docs/brief/013-tesserati-semplificati.md` (richiesta dell'utente del 2026-11-17, proposte approvate) —
una sola pagina Tesserati dove, per l'anno scelto, si confermano i tesserati dell'anno prima man mano che pagano, si
sistema la loro famiglia e si aggiungono i nuovi; la pagina Riconferme sparisce; l'import Excel è solo
dell'amministratore. Corregge le specifiche 008, 009 e 011.

**Regole di riferimento**: `docs/dominio/glossario.md` (Riconferma = conferma quando la persona paga, con data —
aggiornato il 2026-11-17); `docs/dominio/utenti.md` (import riservato all'amministratore — aggiornato il 2026-11-17);
`docs/dominio/regole-famiglia.md` §1–§3; specifiche 004–011; constitution, principi I, III, IV e V.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Confermare chi paga in un solo elenco (Priority: P1)

L'utente apre "Tesserati" e sceglie l'anno (es. 2027/28 con i dati finti). Vede un unico elenco: i tesserati dell'anno
prima non ancora confermati con lo stato "Da confermare" e gli iscritti dell'anno con "Pagato il …". Un filtro (Tutti /
Da confermare / Iscritti) e una ricerca per nome aiutano a trovare la persona. Quando una persona paga, preme
"Conferma": la persona diventa iscritta con la data di pagamento (oggi, modificabile) e l'elenco del nuovo anno
ricalcolato dall'età.

**Why this priority**: è il lavoro di tutti i giorni durante il tesseramento.

**Independent Test**: dati finti del 2026/27 e listino 2027/28: Tesserati 2027/28 mostra 37 "Da confermare"; confermando
MORETTI CARLA lo stato diventa "Pagato il 17/11/2026" e il filtro "Iscritti" mostra 1 persona.

**Acceptance Scenarios**:

1. **Given** i dati finti del 2026/27 e il listino 2027/28, **When** si apre Tesserati 2027/28, **Then** compare
   "37 da confermare · 0 iscritti" e ogni riga ha nome, data di nascita, elenco del 2027/28 (con l'avviso se cambia, es.
   "Passa da ACR a Giovani") e "Conferma".
2. **Given** MORETTI CARLA da confermare, **When** si preme "Conferma" e si lascia la data di oggi, **Then** la riga
   diventa "Pagato il 17/11/2026" e il conteggio "36 da confermare · 1 iscritto".
3. **Given** la ricerca "gallo", **When** si scrive nel campo, **Then** compaiono solo le righe con GALLO nel nome.
4. **Given** una conferma fatta per errore, **When** si preme "Annulla conferma" e si conferma, **Then** la persona
   torna "Da confermare" (non si può se è in una famiglia confermata dell'anno: "Prima togli questa persona dalla
   famiglia del 2027/28.").
5. **Given** un anno senza listino del nuovo anno, **When** si apre Tesserati, **Then** compare "Manca il listino
   2027/28. Crealo nella sezione Listini." e "Conferma" è disattivato.
6. **Given** nessuna connessione, **When** si conferma, **Then** compare "Impossibile salvare. Controlla la connessione
   e riprova. Non è stato salvato nulla."

---

### User Story 2 - Vedere e sistemare la famiglia di chi si conferma (Priority: P1)

Confermando una persona che ha una famiglia (famiglia confermata dell'anno, o lo stesso `N. Legame` dell'anno prima),
si apre il pannello "Famiglia": i componenti con il loro stato (Da confermare / Pagato il …), "Conferma" per ciascuno,
"Togli" e "Aggiungi un tesserato", e "Conferma famiglia" per l'anno.

**Why this priority**: la quota dipende dalla famiglia; sistemarla mentre la persona paga evita un secondo giro in
"Famiglie".

**Independent Test**: confermando GALLO LUCA (`N. Legame` 900003) il pannello mostra i 4 GALLO/CONTI: confermati gli
altri 3 e premuto "Conferma famiglia", la famiglia 900003 del 2027/28 è confermata con 4 componenti.

**Acceptance Scenarios**:

1. **Given** GALLO LUCA da confermare, **When** si preme "Conferma", **Then** si apre il pannello "Famiglia · N. Legame
   900003" con GALLO LUCA "Pagato il …" e CONTI MARTA, GALLO TOMMASO, GALLO GIULIA "Da confermare".
2. **Given** il pannello, **When** si conferma CONTI MARTA, **Then** il suo stato nel pannello e nell'elenco diventa
   "Pagato il …".
3. **Given** 2 componenti iscritti nel pannello, **When** si preme "Conferma famiglia", **Then** la famiglia del 2027/28
   è confermata con i soli componenti iscritti; chi non ha ancora pagato si potrà aggiungere dopo dal pannello.
4. **Given** una famiglia già confermata, **When** si apre il pannello di un componente, **Then** si vedono i componenti
   effettivi e si possono togliere o aggiungere tesserati iscritti dell'anno, salvando con "Conferma famiglia".
5. **Given** una persona senza `N. Legame` e senza famiglia, **When** si conferma, **Then** il pannello dice "Nessuna
   famiglia" e permette "Crea famiglia" aggiungendo altri iscritti.

---

### User Story 3 - Nuovo tesserato nella stessa pagina (Priority: P2)

"Nuovo tesserato" (come nella 009) è nella pagina Tesserati; l'iscrizione vale come pagamento (data di oggi,
modificabile) e la persona compare tra gli iscritti.

**Why this priority**: chi si iscrive per la prima volta paga come gli altri; deve stare nello stesso elenco.

**Independent Test**: BIANCO LUCA nato nel 2019 iscritto nel 2027/28 → riga "Pagato il 17/11/2026", elenco ACR.

**Acceptance Scenarios**:

1. **Given** il modulo compilato, **When** si iscrive, **Then** la persona è tra gli iscritti con "Pagato il …" e
   "Nuovo".
2. **Given** una persona dell'anno prima inserita nel modulo, **When** la si cerca, **Then** il modulo dice "È tra i
   tesserati del 2026/27: usa Conferma nell'elenco." (come la 009, senza la pagina Riconferme).

---

### User Story 4 - Import solo per l'amministratore (Priority: P1)

Solo l'amministratore vede "Importa Excel" nella home e può aprire la pagina e importare; per gli altri la voce non c'è
e la pagina non si apre.

**Why this priority**: l'import crea molte persone in un colpo; lo fa una persona sola.

**Independent Test**: con l'utente amministratore la home ha "Importa Excel"; con un altro utente autorizzato no, e
l'indirizzo /importa porta alla home; le regole rifiutano un import fatto da un non amministratore.

**Acceptance Scenarios**:

1. **Given** l'amministratore, **When** apre la home, **Then** vede "Importa Excel" e può importare.
2. **Given** un utente autorizzato non amministratore, **When** apre la home, **Then** non vede "Importa Excel"; se
   apre /importa torna alla home.
3. **Given** un utente non amministratore, **When** prova a importare (anche senza l'app), **Then** le regole lo
   impediscono.

---

### Edge Cases

- Persona da confermare con data di nascita incoerente: "Data di nascita incoerente: non si può confermare".
- Data di pagamento nel futuro: rifiutata ("La data di pagamento non può essere nel futuro.").
- Adesioni già esistenti senza data di pagamento (riconfermate o inserite prima della 013): "Iscritto · pagamento non
  registrato"; si può aggiungere la data con "Registra pagamento".
- Pannello famiglia per un componente che non era tesserato l'anno prima: compare solo se è già iscritto quest'anno.
- Più famiglie con lo stesso `N. Legame`: vale la famiglia confermata dell'anno, poi il `N. Legame` dell'anno prima.
- Due utenti confermano la stessa persona quasi insieme: la seconda conferma è rifiutata e l'elenco si aggiorna.
- "Cambia elenco" con nota (011) resta come azione secondaria della riga ("Altre azioni").
- Utente non autorizzato: nessun accesso.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La pagina "Tesserati" MUST mostrare, per l'anno scelto, un unico elenco con i tesserati dell'anno
  precedente non ancora iscritti ("Da confermare") e gli iscritti dell'anno ("Pagato il …", "pagamento non registrato",
  "Nuovo"), con il filtro Tutti / Da confermare / Iscritti, la ricerca per cognome e nome e il conteggio "N da
  confermare · M iscritti".
- **FR-002**: "Conferma" MUST creare l'adesione dell'anno (elenco per età dal listino, `Legame` e `N. Legame` dell'anno
  prima) con la data di pagamento (oggi, modificabile, non futura) e l'email di chi conferma; senza listino dell'anno
  MUST NOT essere possibile.
- **FR-003**: "Annulla conferma" MUST togliere l'adesione confermata (riconferma o nuovo), con conferma, solo se la persona
  non è in una famiglia confermata dell'anno.
- **FR-004**: Dopo "Conferma" di una persona con famiglia, la pagina MUST aprire il pannello "Famiglia" con i componenti
  (famiglia confermata dell'anno o stesso `N. Legame` dell'anno prima) e il loro stato; dal pannello MUST potersi
  confermare ogni componente, togliere o aggiungere tesserati iscritti dell'anno e confermare la famiglia dell'anno
  (almeno 2 iscritti, una famiglia per persona per anno, come la 007).
- **FR-005**: Il pannello MUST potersi aprire anche dalla riga di un iscritto ("Famiglia") e, per chi non ha famiglia,
  permettere "Crea famiglia".
- **FR-006**: "Nuovo tesserato" (009) MUST stare nella pagina Tesserati e salvare anche la data di pagamento; il rimando
  per chi era tesserato l'anno prima MUST indicare "Conferma" nell'elenco.
- **FR-007**: Le adesioni esistenti senza data di pagamento MUST risultare "pagamento non registrato" e MUST potersi
  completare con "Registra pagamento" (data e email).
- **FR-008**: La pagina Riconferme MUST sparire (voce della home e rotta, che rimanda a Tesserati); "Allinea tutte" e il
  conteggio delle non allineate MUST sparire; l'avviso di cambio di elenco sulla riga e "Cambia elenco" con nota MUST
  restare, quest'ultimo come azione secondaria.
- **FR-009**: Solo l'amministratore (segno sull'email autorizzata, impostato dalla console) MUST vedere e usare
  "Importa Excel"; le regole di sicurezza MUST rifiutare l'import a chiunque altro.
- **FR-010**: Le regole MUST accettare la data di pagamento solo con data ed email di chi salva e una data non futura,
  e MUST permettere "Registra pagamento" senza cambiare altri campi.
- **FR-011**: Pagine Famiglie, Quote, Listini e Import (per l'amministratore) MUST continuare a funzionare; la pagina
  Famiglie resta per la vista d'insieme.

### Key Entities *(include if feature involves data)*

- **Adesione** (esistente): + data di pagamento ed email di chi l'ha registrata (per conferme e nuovi; facoltativa per le
  adesioni importate o precedenti alla 013).
- **Email autorizzata** (esistente): + segno "amministratore".
- **Famiglia dell'anno** (007): confermata dal pannello.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Confermare una persona che paga richiede al massimo 2 azioni (trovarla e "Conferma").
- **SC-002**: Confermare una famiglia di 4 persone che pagano insieme richiede al massimo 6 azioni dal pannello.
- **SC-003**: Una sola pagina per confermare, iscrivere e sistemare le famiglie: 0 passaggi obbligati da altre pagine.
- **SC-004**: 0 import riusciti da utenti non amministratori (test delle regole).
- **SC-005**: L'elenco di un anno con ~165 persone si apre in meno di 3 secondi.

## Assumptions

- I dati finti sono del 2026/27, quindi gli esempi confermano verso il 2027/28 con un listino 2027/28 di prova; nella
  realtà si conferma dal 2025/26 al 2026/27 col listino del PDF.
- Il segno di amministratore sull'email di chi mantiene il progetto si mette dalla console al rilascio, con il suo ok.
- Pagamenti con importo e incassi restano per la 012.
