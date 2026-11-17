# Feature Specification: Riconferma adesione

**Feature Branch**: `008-riconferma-adesione`

**Created**: 2026-11-17

**Status**: Draft

**Input**: Brief `docs/brief/008-riconferma-adesione.md` (tutte le proposte approvate il 2026-11-17) — una sezione
"Riconferme" che, per un anno nuovo, elenca i tesserati dell'anno precedente non ancora iscritti e crea l'adesione di
chi rinnova, con il settore ricalcolato dall'età.

**Regole di riferimento**: `docs/dominio/glossario.md` (Riconferma = adesione dell'anno immediatamente precedente; chi
torna dopo 2+ anni è una nuova adesione — aggiornato il 2026-11-17); `docs/dominio/regole-famiglia.md` §1 (`N.
Legame`), §2 (identità), §3 (settore ricalcolato sempre in automatico con le fasce del listino del nuovo anno; `Legame`
e `N. Legame` copiati — aggiornato il 2026-11-17); `docs/dominio/regole-quote.md` (fasce, età minima); specifiche 003,
004–006 (persone e adesioni; una sola adesione per persona per anno), 007, 010; constitution, principi I, III e IV.

## Clarifications

### Session 2026-11-17

- Q: Nella pagina "Riconferme", come devono comparire le persone da decidere? → A: raggruppate per `N. Legame` (ogni gruppo con la casella "tutto il nucleo"), poi i singoli in ordine di cognome e nome.
- Q: Si può annullare la riconferma di una persona per cui in "Quote" è già salvata una quota del nuovo anno? → A: sì, con un avviso nella conferma ("La quota salvata del suo nucleo andrà ricalcolata in Quote."); poi in "Quote" il nucleo risulta da ricalcolare.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Vedere chi può rinnovare (Priority: P1)

Un utente autorizzato apre "Riconferme" e sceglie l'anno nuovo. Vede i tesserati dell'anno precedente che non hanno
ancora un'adesione nell'anno nuovo, con l'età e l'elenco (ACR, Giovani, Adulti) che avranno nell'anno nuovo e l'avviso
quando l'elenco cambia ("passa da ACR a Giovani") o quando l'età è sotto il minimo del listino.

**Why this priority**: è il punto di partenza dell'anno nuovo; senza questa vista la segreteria dovrebbe ribattere o
reimportare tutti.

**Independent Test**: con i tre elenchi finti del 2026 importati e un listino 2027/28, "Riconferme" 2027/28 elenca 37
persone; RINALDI PIETRO "passa da ACR a Giovani", RIZZO VALERIA "passa da Giovani ad Adulti", GATTI MIA (5 anni) ha
l'avviso "non previsto dal listino".

**Acceptance Scenarios**:

1. **Given** i dati finti del 2026 e il listino 2027/28, **When** si apre "Riconferme" 2027/28, **Then** compaiono 37
   persone da decidere: 9 gruppi per `N. Legame` (900001–900009, 27 persone) e poi 10 singoli in ordine di
   cognome e nome, ciascuna con età ed elenco del 2027.
7. **Given** il gruppo `N. Legame` 900003 (4 persone), **When** si spunta "tutto il nucleo", **Then** risultano
   spuntati tutti e 4 i componenti; togliendo la spunta a uno, la casella del nucleo non è più piena.
2. **Given** RINALDI PIETRO (nato nel 2012, ACR nel 2026), **When** compare nell'elenco, **Then** ha 15 anni, elenco
   Giovani e l'avviso "Passa da ACR a Giovani".
3. **Given** RIZZO VALERIA (nata nel 1997, Giovani nel 2026), **When** compare nell'elenco, **Then** ha 30 anni, elenco
   Adulti e l'avviso "Passa da Giovani ad Adulti" (fasce del PDF, non dell'export).
4. **Given** GATTI MIA (nata nel 2022), **When** compare nell'elenco, **Then** ha 5 anni, elenco ACR e l'avviso "Sotto
   l'età minima del listino (6 anni): quota non prevista".
5. **Given** un anno nuovo senza listino, **When** si apre "Riconferme", **Then** compare "Manca il listino 2027/28.
   Crealo nella sezione Listini." e non si può riconfermare nessuno.
6. **Given** un anno il cui anno precedente non ha tesserati, **When** si apre "Riconferme", **Then** compare "Nessun
   tesserato nel 2026/27 da riconfermare."

---

### User Story 2 - Riconfermare chi rinnova (Priority: P1)

L'utente spunta una o più persone (o "Seleziona tutti") e preme "Riconferma". Per ciascuna nasce l'adesione del nuovo
anno con l'elenco ricalcolato, il `Legame` e il `N. Legame` dell'anno prima, la data e l'email di chi riconferma. Le
persone riconfermate escono dall'elenco "da decidere" e compaiono in Tesserati, Famiglie e Quote del nuovo anno.

**Why this priority**: è l'azione che fa risparmiare il lavoro; insieme alla US1 è il prodotto minimo.

**Independent Test**: riconfermare tutti i 37: il 2027 ha 37 tesserati (14 ACR, 8 Giovani, 15 Adulti); in "Famiglie"
2027 tornano suggerite le 9 famiglie del 2026 da confermare.

**Acceptance Scenarios**:

1. **Given** 3 persone spuntate, **When** si preme "Riconferma", **Then** nascono 3 adesioni 2027 e il messaggio
   "3 persone riconfermate per il 2027/28."; le altre restano da decidere.
2. **Given** "Seleziona tutti" sui 37, **When** si riconferma, **Then** il 2027 ha 37 tesserati: 14 ACR, 8 Giovani,
   15 Adulti, e nessuna persona nuova in anagrafica.
3. **Given** il 2027 riconfermato, **When** si apre "Famiglie" 2027, **Then** compaiono le 9 famiglie suggerite dai
   `N. Legame` 900001–900009, da confermare.
4. **Given** una connessione assente, **When** si riconferma, **Then** compare "Impossibile salvare. Controlla la
   connessione e riprova. Non è stato salvato nulla." e nessuna adesione nasce (tutto o niente).
5. **Given** una persona già riconfermata da un altro utente pochi istanti prima, **When** si riconferma, **Then** non
   nasce una seconda adesione; la pagina si aggiorna e lo dice.

---

### User Story 3 - Annullare una riconferma e importare dopo (Priority: P2)

Nella stessa pagina l'utente vede anche chi è già stato riconfermato per l'anno nuovo e può annullare una riconferma
fatta per errore, finché la persona non è in una famiglia confermata dell'anno nuovo. Se poi si importa l'Excel dello
stesso anno, le persone già riconfermate sono saltate.

**Why this priority**: corregge gli errori senza toccare la console; l'import successivo non deve creare doppie
adesioni.

**Independent Test**: riconfermare MORETTI CARLA e annullare: torna da decidere. Riconfermare i 15 ACR del 2026 e poi
importare un Excel ACR del 2027: le righe di quelle persone sono saltate come "già presente nell'anno (riconferma)".

**Acceptance Scenarios**:

1. **Given** MORETTI CARLA riconfermata, **When** si preme "Annulla riconferma" e si conferma, **Then** la sua adesione
   2027 sparisce e lei torna tra le persone da decidere.
2. **Given** una persona riconfermata che è in una famiglia confermata del 2027, **When** si guarda la sua riga,
   **Then** "Annulla riconferma" non è disponibile e compare "Prima togli questa persona dalla famiglia del 2027/28."
3. **Given** una persona del 2027 nata da un import, **When** compare tra gli iscritti, **Then** non ha "Annulla
   riconferma".
4. **Given** MORETTI CARLA riconfermata e la sua quota 2027 già salvata in "Quote", **When** si preme "Annulla
   riconferma", **Then** la conferma avvisa "La quota salvata del suo nucleo andrà ricalcolata in Quote."; dopo
   l'annullamento, in "Quote" 2027/28 il suo nucleo risulta da ricalcolare e la quota salvata non cambia da sola.
5. **Given** persone riconfermate per il 2027, **When** si importa un Excel del 2027 che le contiene, **Then** le loro
   righe sono saltate come "già presente nell'anno (riconferma)" e le adesioni riconfermate non cambiano.

---

### Edge Cases

- Persona dell'anno precedente già iscritta nell'anno nuovo (da import o riconferma): non compare tra le persone da
  decidere; compare tra gli iscritti.
- Persona con adesione due anni prima ma non l'anno prima: non compare (nuova adesione, specifica 009).
- Anno nuovo scelto senza anno precedente importato o riconfermato: messaggio "Nessun tesserato nel … da
  riconfermare."; l'anno precedente può a sua volta essere fatto di riconferme.
- Data di nascita incoerente con l'anno nuovo (persona "nata dopo" l'anno): mostrata con l'avviso "Data di nascita
  incoerente" e non riconfermabile finché qualcuno non la corregge (fuori ambito).
- La riconferma non cambia mai l'anagrafica né le adesioni dell'anno precedente.
- Le famiglie confermate dell'anno precedente non si copiano: tornano come suggerite tramite il `N. Legame`; le
  famiglie fatte a mano (senza `N. Legame`) vanno rifatte.
- Utente non autorizzato: nessun accesso.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Gli utenti autorizzati MUST poter aprire una pagina "Riconferme" e scegliere l'anno nuovo (un anno con
  tesserati nell'anno immediatamente precedente, o quello successivo all'ultimo anno con tesserati).
- **FR-002**: La pagina MUST elencare i tesserati dell'anno immediatamente precedente senza adesione nell'anno nuovo
  ("da decidere"), raggruppati per `N. Legame` dell'anno precedente (gruppi in ordine di `N. Legame`, componenti dal
  più anziano) con una casella "tutto il nucleo" per gruppo, poi chi non ha `N. Legame` in ordine di cognome e nome;
  a parte quelli già iscritti nell'anno nuovo; con il conteggio di entrambi.
- **FR-003**: Per ogni persona MUST mostrare età nell'anno nuovo (anno associativo − anno di nascita) ed elenco del
  nuovo anno ricavato dalle fasce del listino del nuovo anno (ACR → ACR; Giovanissimi e Giovani → Giovani; Adulti →
  Adulti; sotto l'età minima → ACR), con l'avviso se l'elenco cambia rispetto all'anno precedente o se l'età è sotto il
  minimo.
- **FR-004**: Senza listino dell'anno nuovo la pagina MUST dirlo e MUST NOT permettere riconferme.
- **FR-005**: L'utente MUST poter spuntare una, alcune o tutte le persone da decidere e riconfermarle insieme; per
  ciascuna MUST nascere un'adesione dell'anno nuovo con origine "riconferma", elenco ricalcolato, `Legame` e `N. Legame`
  copiati dall'anno precedente, data ed email di chi riconferma; tutto o niente per ogni gruppo di salvataggio (al
  massimo 15 persone, per il limite delle regole di sicurezza): se un gruppo fallisce, i gruppi già salvati restano,
  la pagina dice quante persone sono state riconfermate e le altre restano da decidere.
- **FR-006**: Una persona MUST avere al massimo un'adesione per anno: una riconferma di chi è già iscritto nell'anno
  nuovo MUST essere rifiutata, anche se avviene in contemporanea da due utenti.
- **FR-007**: La riconferma MUST NOT creare persone nuove né modificare anagrafiche o adesioni di altri anni.
- **FR-008**: Una riconferma MUST potersi annullare ("Annulla riconferma", con conferma) solo se l'adesione è nata da
  una riconferma e la persona non è in una famiglia confermata dell'anno nuovo; se il suo nucleo ha una quota salvata
  dell'anno nuovo (010), la conferma MUST avvisare che andrà ricalcolata, e la quota salvata MUST NOT cambiare da sola.
- **FR-009**: L'import di un Excel dell'anno nuovo MUST saltare le righe delle persone già riconfermate, con il motivo
  "già presente nell'anno (riconferma)", senza cambiare la loro adesione.
- **FR-010**: Le persone riconfermate MUST comparire in Tesserati, Famiglie (suggerite dal `N. Legame` copiato) e Quote
  dell'anno nuovo come quelle importate.
- **FR-011**: Solo gli utenti autorizzati MUST poter leggere, creare e annullare riconferme; le regole di sicurezza
  MUST impedire riconferme di persone senza adesione nell'anno precedente, con anno non consecutivo, con data o email
  non di chi salva, e annullamenti di adesioni nate da un import.
- **FR-012**: Con i dati finti del 2026 e un listino 2027/28 la pagina 2027/28 MUST elencare 37 persone; riconfermate
  tutte, il 2027 MUST avere 14 ACR, 8 Giovani, 15 Adulti, con 2 cambi di elenco (RINALDI PIETRO, RIZZO VALERIA) e 1
  avviso di età minima (GATTI MIA).

### Key Entities *(include if feature involves data)*

- **Adesione riconfermata**: adesione di una persona per l'anno nuovo con origine "riconferma"; elenco del nuovo anno,
  `Legame` e `N. Legame` dell'anno precedente, data ed email di chi riconferma. Nessun import collegato.
- **Persona**: quella già in anagrafica (004–006), mai duplicata né modificata.
- **Listino dell'anno nuovo**: quello della 003, letto per le fasce e l'età minima.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Riconfermare tutti i 37 tesserati finti del 2026 richiede al massimo 3 azioni (scegliere l'anno,
  "Seleziona tutti", "Riconferma").
- **SC-002**: Dopo la riconferma completa, 0 persone duplicate in anagrafica e 0 persone con due adesioni nello stesso
  anno (verificato con test, anche con un import successivo).
- **SC-003**: 100% delle persone riconfermate con l'elenco previsto dalle fasce del PDF (2 cambi di elenco nei dati
  finti).
- **SC-004**: La pagina di un anno con ~165 tesserati dell'anno precedente si apre in meno di 3 secondi e la
  riconferma di tutti si completa in meno di 10 secondi.
- **SC-005**: Gli utenti non autorizzati non riescono mai a leggere, creare o annullare riconferme (test delle regole).

## Assumptions

- La segreteria crea il listino dell'anno nuovo (003) prima di riconfermare.
- L'identità della persona è già quella dell'anagrafica: nessun confronto di nomi in questa specifica.
- Le quote dell'anno nuovo si calcolano e salvano nella pagina "Quote" (010); la riconferma non salva quote.
- Il `N. Legame` potrebbe cambiare da un anno all'altro nell'export nazionale (TODO di `regole-famiglia.md` §1): se il
  nuovo Excel lo cambia, le righe riconfermate sono comunque saltate e restano col `N. Legame` copiato.
- Nuovo tesserato (009), cambio di elenco forzato a mano (011), pagamenti e riepiloghi (012) sono fuori ambito.
