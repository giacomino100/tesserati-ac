# Feature Specification: Quote nella famiglia

**Feature Branch**: `010-quote-famiglia`

**Created**: 2026-11-17

**Status**: Draft

**Input**: Brief `docs/brief/010-quote-famiglia.md` (decisioni di revisione approvate il 2026-11-17; specifica
anticipata rispetto a 008–009) — una pagina "Quote" che per ogni anno mostra la quota di ogni nucleo calcolata con il
listino dell'anno, gestisce a mano i nuclei non previsti dal PDF e salva le quote dell'anno.

**Regole di riferimento**: `docs/dominio/regole-quote.md` (unica fonte: il PDF; listino, età = anno associativo −
anno di nascita, fasce del PDF e non dell'export, pacchetti familiari, 29 esempi; §4 casi non previsti: quota manuale
del nucleo con nota obbligatoria, anche per date di nascita incoerenti — aggiornato il 2026-11-17);
`docs/dominio/regole-famiglia.md` §1 (nucleo = famiglia confermata; chi non ne ha è un nucleo da 1); specifiche 002,
003, 007; constitution, principi I, II, III e IV.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Vedere le quote dell'anno (Priority: P1)

Un utente autorizzato apre "Quote" e sceglie l'anno. Vede ogni nucleo (famiglie confermate e tesserati senza famiglia)
con i componenti, l'età, la fascia del listino, la quota piena, il beneficio (sconto 20%, gratis, pacchetto 2 ACR),
l'importo di ciascuno e il totale del nucleo; in cima il totale dell'anno e quanti nuclei non sono previsti dal PDF.

**Why this priority**: è il risultato che serve alla segreteria per chiedere le quote alle famiglie.

**Independent Test**: con i tre elenchi finti del 2026 importati e le 9 famiglie confermate, "Quote" 2026/27 mostra 19
nuclei: 17 calcolati per un totale di 565,00 € e 2 non previsti (il nucleo 900004 da 6 persone e GATTI MIA di 4 anni).

**Acceptance Scenarios**:

1. **Given** i dati finti del 2026 con le famiglie confermate, **When** si apre "Quote" 2026/27, **Then** compaiono
   19 nuclei, il totale "565,00 €" dei 17 nuclei calcolati e "2 nuclei non previsti dal listino".
2. **Given** la famiglia 900003 (2 adulti + 2 ACR), **When** se ne apre il dettaglio, **Then** si vedono 26,00 +
   26,00 + 12,00 (sconto 20%) + 0,00 (gratis) e il totale 64,00 €, come l'esempio 26 di `regole-quote.md`.
3. **Given** la famiglia 900005 (2 fratelli ACR), **When** se ne apre il dettaglio, **Then** si vede "Pacchetto 2 ACR"
   e il totale 25,00 €.
4. **Given** un tesserato dell'export nella fascia `26/30` ma nato nel 1996, **When** si calcola il 2026/27, **Then**
   la sua fascia è Adulti (età 30), come dice il PDF.
5. **Given** famiglie suggerite non ancora confermate, **When** si apre "Quote", **Then** compare l'avviso "N famiglie
   suggerite non confermate: i loro componenti sono calcolati come singoli" con il collegamento a "Famiglie".
6. **Given** un anno senza listino, **When** si apre "Quote", **Then** compare "Manca il listino 2027/28. Crealo nella
   sezione Listini." e nessuna quota è calcolata.

---

### User Story 2 - Quota manuale dei nuclei non previsti (Priority: P1)

Per ogni nucleo non previsto dal PDF l'app mostra il motivo (più di 4 persone, componente sotto i 6 anni, data di
nascita incoerente) e chiede l'importo del nucleo e una nota obbligatoria.

**Why this priority**: senza la quota di questi nuclei il totale dell'anno è incompleto; il PDF non dice come
calcolarli, quindi decide una persona.

**Independent Test**: per GATTI MIA si inserisce 15,00 € con la nota "Iscritta come ACR su decisione del consiglio":
il nucleo risulta "quota manuale" e il totale dell'anno sale di 15,00 €; senza nota non si salva.

**Acceptance Scenarios**:

1. **Given** il nucleo 900004 da 6 persone, **When** si apre, **Then** compare "Non previsto dal listino: il nucleo ha
   più di 4 persone" e i campi "Quota del nucleo" e "Nota (obbligatoria)".
2. **Given** l'importo 140,00 € e una nota, **When** si salva, **Then** il nucleo mostra 140,00 € come quota manuale con
   la nota, la data e l'email di chi l'ha inserita.
3. **Given** un importo senza nota, o un importo non valido (es. "abc", -5, più di due decimali), **When** si prova a
   salvare, **Then** compare l'errore accanto al campo e nulla viene salvato.

---

### User Story 3 - Salvare le quote e ricalcolarle (Priority: P2)

L'utente salva le quote dell'anno ("Salva le quote dell'anno"): vengono conservate così come sono, con data ed email.
Se dopo cambiano il listino, le famiglie o i tesserati dell'anno, la pagina mostra "Quote da ricalcolare" con i nuclei
interessati; il ricalcolo si fa solo premendo "Ricalcola". Le quote manuali restano finché qualcuno non le cambia.

**Why this priority**: le quote comunicate alle famiglie non devono cambiare da sole (constitution IV; promessa della
003); il ricalcolo è una scelta consapevole.

**Independent Test**: salvare le quote 2026, poi cambiare la quota Adulti del listino 2026: la pagina mostra "Quote da
ricalcolare" e i totali salvati restano quelli di prima; dopo "Ricalcola" e "Salva" i totali sono quelli nuovi.

**Acceptance Scenarios**:

1. **Given** le quote 2026 calcolate, **When** si preme "Salva le quote dell'anno", **Then** le quote risultano salvate
   con data ed email e la pagina le mostra come salvate.
2. **Given** quote salvate e poi una famiglia corretta in "Famiglie", **When** si apre "Quote", **Then** compare "Quote
   da ricalcolare: 1 nucleo è cambiato" e il nucleo mostra sia la quota salvata sia quella che risulterebbe ora.
3. **Given** quote salvate e un listino modificato, **When** si preme "Ricalcola" e poi "Salva le quote dell'anno",
   **Then** le quote salvate diventano quelle nuove.
4. **Given** una quota manuale salvata, **When** si ricalcola l'anno, **Then** la quota manuale resta (con la sua nota)
   finché il nucleo non cambia composizione; se cambia, il nucleo torna da decidere.

---

### Edge Cases

- Nucleo che passa da previsto a non previsto (o viceversa) dopo una correzione delle famiglie: segnalato tra quelli
  da ricalcolare; una quota manuale non si applica più a un nucleo diventato calcolabile, e viceversa.
- Tesserato in un nucleo confermato ma senza più l'adesione dell'anno: non compare; il nucleo è da ricalcolare.
- Importi sempre in euro con due decimali, interi in centesimi; nessun arrotondamento.
- Il calcolo non usa mai la colonna `Fasce d'età` dell'export: l'età viene dalla data di nascita.
- Utente non autorizzato: nessun accesso.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Gli utenti autorizzati MUST poter aprire una pagina "Quote" e scegliere un anno associativo importato.
- **FR-002**: I nuclei dell'anno MUST essere le famiglie confermate (007, con i componenti effettivi) e ogni
  tesserato dell'anno senza famiglia confermata (nucleo da 1); i componenti delle famiglie suggerite non confermate
  MUST essere calcolati come singoli, con un avviso che le conta e rimanda a "Famiglie".
- **FR-003**: La quota di ogni nucleo MUST essere calcolata solo con il calcolo della specifica 002 e il listino
  dell'anno salvato (003); se manca il listino dell'anno, nessuna quota è calcolata e la pagina lo dice.
- **FR-004**: Per ogni nucleo calcolato la pagina MUST mostrare componenti, età, fascia, quota piena, beneficio,
  importo e totale; in cima MUST mostrare il totale dell'anno e il numero di nuclei non previsti o senza quota.
- **FR-005**: I nuclei non previsti dal PDF (più di 4 persone, componente sotto l'età minima, data di nascita
  incoerente) MUST essere segnalati con il motivo e MUST NOT ricevere una quota calcolata.
- **FR-006**: Per un nucleo non previsto MUST potersi inserire un solo importo del nucleo (euro, al massimo due
  decimali, maggiore o uguale a zero) con una nota obbligatoria; si salvano data ed email di chi la inserisce.
- **FR-007**: Le quote dell'anno MUST potersi salvare ("Salva le quote dell'anno") per nucleo: componenti, righe del
  calcolo o quota manuale con nota, totale, data ed email.
- **FR-008**: Le quote salvate MUST NOT cambiare da sole: se il calcolo attuale di un nucleo è diverso da quello salvato
  (listino, componenti o tesserati cambiati), la pagina MUST indicarlo ("Quote da ricalcolare") mostrando entrambi i
  valori; il ricalcolo e il nuovo salvataggio si fanno solo su richiesta.
- **FR-009**: Una quota manuale MUST restare valida finché il nucleo ha gli stessi componenti; se la composizione
  cambia, il nucleo torna da decidere.
- **FR-010**: Solo gli utenti autorizzati MUST poter leggere e scrivere le quote; le regole di sicurezza MUST
  impedire importi non interi o negativi, note vuote per le quote manuali e date o email non di chi salva.
- **FR-011**: Con i dati finti del 2026 (tre elenchi importati, 9 famiglie confermate) MUST risultare 19 nuclei, 17
  calcolati per 565,00 € e 2 non previsti (900004 e GATTI MIA).

### Key Entities *(include if feature involves data)*

- **Nucleo dell'anno**: famiglia confermata o tesserato senza famiglia; componenti con data di nascita.
- **Quota del nucleo (salvata)**: per anno e nucleo; componenti al momento del salvataggio, righe per componente
  (età, fascia, quota piena, beneficio, importo) o quota manuale con nota e motivo, totale, data ed email.
- **Listino dell'anno**: quello della 003, letto e mai modificato da questa pagina.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: I 29 esempi di `regole-quote.md` danno lo stesso totale anche quando i nuclei arrivano dalle famiglie e
  dal listino salvati (verificato con test).
- **SC-002**: Con i dati finti del 2026: 19 nuclei, 565,00 € calcolati, 2 non previsti — 100% dei nuclei con una quota
  o una segnalazione.
- **SC-003**: Dopo il salvataggio, cambiare listino, famiglie o tesserati non cambia nessuna quota salvata (0 nuclei
  modificati senza "Ricalcola").
- **SC-004**: 0 quote manuali salvate senza nota.
- **SC-005**: La pagina di un anno con ~165 tesserati mostra le quote in meno di 3 secondi.
- **SC-006**: Gli utenti non autorizzati non riescono mai a leggere o scrivere le quote (test delle regole).

## Assumptions

- Il calcolo della 002 è già testato sui 29 esempi; questa specifica lo usa senza cambiarlo.
- I nuclei si identificano con la famiglia confermata (ID) o con la persona (nucleo da 1).
- Pagamenti e incassi, riconferma (008), nuovo tesserato (009), cambio di fascia forzato (011) e riepiloghi/export
  (012) sono fuori ambito.
