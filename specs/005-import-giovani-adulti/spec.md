# Feature Specification: Import Giovani e Adulti

**Feature Branch**: `005-import-giovani-adulti`

**Created**: 2026-11-17

**Status**: Draft

**Input**: Brief `docs/brief/005-import-giovani-adulti.md` (decisioni di revisione approvate il 2026-11-17) — dalla
stessa schermata di import della specifica 004 si caricano anche gli elenchi Giovani e Adulti; l'app riconosce
l'elenco, mostra l'anteprima e salva persone e adesioni dell'anno.

**Regole di riferimento**: `docs/dominio/excel-esempio/README.md` (stessa struttura nei tre file; il file coincide
con la colonna `Settore`); `docs/dominio/glossario.md` (settore, fascia d'età dell'export);
`docs/dominio/regole-famiglia.md` §0 e §2; specifica 004 (comportamento dell'import); constitution, principi III
e IV.

## Clarifications

### Session 2026-11-17

- Q: Se in un file due settori hanno lo stesso numero di righe, l'import deve rifiutare il file o chiedere all'utente di quale elenco si tratta? → A: l'anteprima chiede all'utente di scegliere l'elenco tra i settori in parità; non si può confermare finché non ha scelto.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Importare l'elenco Giovani o Adulti (Priority: P1)

Un utente autorizzato apre "Importa Excel" e sceglie `ElencoAdesioni_Giovani.xlsx` (o `ElencoAdesioni_Adulti.xlsx`).
L'anteprima dice quale elenco è stato riconosciuto ("Elenco Giovani"), l'anno, le righe e le righe saltate; alla
conferma persone e adesioni dell'anno vengono salvate come per l'ACR, anche se l'ACR dello stesso anno è già stato
importato.

**Why this priority**: senza Giovani e Adulti nessuna famiglia è completa (20 nuclei su 43 sono sparsi su più
elenchi), quindi famiglie e quote non si possono fare.

**Independent Test**: con l'ACR 2026 già importato, caricare il file Giovani finto: l'anteprima mostra "Elenco
Giovani", 2026/27, 8 righe; alla conferma risultano 8 adesioni Giovani del 2026 in più, senza toccare le 15 ACR.

**Acceptance Scenarios**:

1. **Given** l'ACR 2026 importato e il file Giovani finto, **When** l'utente lo sceglie, **Then** l'anteprima mostra
   "Elenco Giovani", anno 2026/27, 8 righe da importare.
2. **Given** l'anteprima del file Giovani, **When** l'utente conferma, **Then** vengono salvate 8 adesioni del 2026 e
   il riepilogo indica "elenco Giovani".
3. **Given** il file Adulti finto e nessun elenco del 2026 ancora importato, **When** l'utente lo importa, **Then**
   vengono salvate 14 adesioni del 2026: l'ordine degli elenchi non conta.
4. **Given** l'elenco Giovani 2026 già importato, **When** si carica di nuovo il file Giovani del 2026, **Then**
   l'import è rifiutato con il messaggio "L'elenco Giovani del 2026/27 è già stato importato." e nulla cambia.
5. **Given** il file ACR finto, **When** viene caricato, **Then** il comportamento è quello della specifica 004 e
   l'anteprima mostra "Elenco ACR".
6. **Given** un file con 5 righe `GIOVANI` e 5 righe `ADULTI`, **When** viene caricato, **Then** l'anteprima chiede
   "Di quale elenco si tratta?" con le scelte "Giovani" e "Adulti", e "Importa" resta disattivato finché l'utente
   non sceglie.

---

### User Story 2 - Persone condivise tra elenchi e anni (Priority: P1)

Le persone già in archivio (da un anno precedente o da un altro elenco) sono riusate. Se una persona dell'elenco ha
già un'adesione nello stesso anno da un altro elenco, la sua riga è saltata con il motivo, perché una persona ha
una sola adesione per anno.

**Why this priority**: evita doppioni di persone e doppie adesioni, che falserebbero famiglie e quote.

**Independent Test**: importare ACR, Giovani e Adulti del 2026 finti: 37 persone e 37 adesioni; i 9 nuclei del
README hanno tutti i loro componenti. Un file Adulti con una riga uguale (cognome, nome, data di nascita) a un
tesserato ACR del 2026 importa le altre righe e salta quella.

**Acceptance Scenarios**:

1. **Given** i tre file finti del 2026, **When** vengono importati uno dopo l'altro, **Then** il 2026 ha 37
   adesioni e 37 persone, e ogni nucleo del README (`N. Legame` 900001–900009) ha tutti i suoi componenti.
2. **Given** una persona già importata nell'elenco ACR del 2026, **When** la stessa persona compare nel file Adulti
   del 2026, **Then** la riga è saltata ed elencata con "Riga N: già importata nell'elenco ACR del 2026/27" e le
   altre righe vengono importate.
3. **Given** una persona importata nel 2026, **When** compare nell'elenco Adulti del 2027, **Then** l'anagrafica
   resta una sola e si aggiunge solo l'adesione del 2027.

---

### User Story 3 - Vedere i tesserati di tutti gli elenchi (Priority: P2)

Nella sezione "Tesserati" si vedono le adesioni dell'anno di tutti gli elenchi importati, ognuna con il suo
settore, e sopra la tabella i totali per settore.

**Why this priority**: rende visibile il risultato dei tre import; la sola lettura dei dati esiste già dalla 004.

**Independent Test**: dopo i tre import finti, "Tesserati" 2026/27 mostra 37 righe e "ACR 15 · Giovani 8 ·
Adulti 14".

**Acceptance Scenarios**:

1. **Given** i tre elenchi 2026 importati, **When** si apre "Tesserati", **Then** si vedono 37 righe ordinate per
   cognome e nome e i totali "ACR 15 · Giovani 8 · Adulti 14".
2. **Given** solo l'elenco Adulti 2026 importato, **When** si apre "Tesserati", **Then** si vedono 14 righe e
   "Adulti 14".

---

### Edge Cases

- Parità tra due o tre settori noti (stesso numero di righe): l'anteprima chiede di scegliere l'elenco tra quelli in
  parità; senza scelta non si importa.
- Settore più frequente sconosciuto (né `RAGAZZI`, né `GIOVANI`, né `ADULTI`), anche in parità con uno noto: file
  rifiutato con il messaggio "Non riesco a capire di quale elenco si tratta".
- Righe di un altro settore dentro un elenco (es. un `ADULTI` nel file Giovani): importate con il loro settore, come
  in 004; l'elenco resta quello del settore prevalente.
- Persona già con un'adesione nello stesso anno da un altro elenco: riga saltata ed elencata (motivo con l'elenco
  di provenienza).
- Tutte le righe saltate perché già importate da altri elenchi: nessun dato salvato e messaggio chiaro, come per
  le altre righe saltate.
- Trentenni (`26/30` nel file Giovani, che il PDF mette negli Adulti): salvati con il settore e la fascia
  dell'export; il ricalcolo per le quote è della 010/011.
- Anno senza listino: rifiutato come in 004 per qualsiasi elenco.
- Utente non autorizzato: nessun accesso, come in 004.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Dalla schermata "Importa Excel" gli utenti autorizzati MUST poter caricare l'elenco ACR, Giovani o
  Adulti.
- **FR-002**: Il sistema MUST riconoscere l'elenco dal settore più frequente tra le righe del file (`RAGAZZI` →
  ACR, `GIOVANI` → Giovani, `ADULTI` → Adulti); se due o tre di questi settori sono in parità, l'anteprima MUST
  chiedere all'utente di scegliere tra loro e MUST NOT permettere l'import senza scelta; se tra i più frequenti c'è
  un settore sconosciuto, il file MUST essere rifiutato.
- **FR-003**: L'anteprima e il riepilogo MUST indicare l'elenco riconosciuto, oltre a quanto previsto dalla 004
  (anno, righe, prime righe, righe saltate).
- **FR-004**: Ogni elenco MUST potersi importare una sola volta per anno associativo: riimportare lo stesso elenco
  dello stesso anno MUST essere rifiutato con un messaggio che nomina l'elenco; importare un elenco diverso dello
  stesso anno MUST essere consentito, in qualsiasi ordine.
- **FR-005**: Le persone già in archivio, da un anno precedente o da un altro elenco, MUST essere riusate senza
  essere duplicate né modificate.
- **FR-006**: Se una persona ha già un'adesione nello stesso anno da un altro elenco, la sua riga MUST essere
  saltata ed elencata con il motivo e l'elenco di provenienza; le altre righe MUST essere importate.
- **FR-007**: Tutte le regole della 004 MUST valere per Giovani e Adulti: colonne cercate per nome, solo colonne
  necessarie, pulizia dei testi, righe saltate elencate, anno con listino obbligatorio, salvataggio tutto o niente,
  nessun dato personale nei log, file letto solo sul dispositivo.
- **FR-008**: Le righe di un settore diverso da quello dell'elenco MUST essere importate con il loro settore.
- **FR-009**: Solo gli utenti autorizzati MUST poter leggere e scrivere persone, adesioni e import di tutti gli
  elenchi; le regole di sicurezza MUST essere testate per ciascun elenco.
- **FR-010**: La sezione "Tesserati" MUST mostrare le adesioni dell'anno di tutti gli elenchi importati e, sopra la
  tabella, i totali per settore (es. "ACR 15 · Giovani 8 · Adulti 14", solo i settori presenti).
- **FR-011**: L'avviso "anno con adesioni" dei listini MUST valere per qualsiasi elenco importato nell'anno.
- **FR-012**: Con i dati finti di `docs/dominio/excel-esempio/` MUST risultare: Giovani 8 adesioni, Adulti 14;
  dopo i tre import il 2026 ha 37 adesioni e 37 persone.

### Key Entities *(include if feature involves data)*

- **Elenco**: ACR, Giovani o Adulti; corrisponde al settore prevalente del file (`RAGAZZI`, `GIOVANI`, `ADULTI`).
- **Import (segno di import)**: un elenco importato per un anno, con data, autore e conteggi; uno per elenco e per
  anno (estende quello della 004, che era solo ACR).
- **Tesserato (persona)** e **Adesione**: come nella 004; una sola adesione per persona per anno, qualunque sia
  l'elenco.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con i tre file finti importati in qualsiasi ordine, il 2026 ha esattamente 37 adesioni e 37 persone.
- **SC-002**: Il 100% dei nuclei finti del README (9) ha, dopo i tre import, tutti i componenti indicati.
- **SC-003**: Il 100% dei riimporti dello stesso elenco nello stesso anno è rifiutato senza aggiungere o modificare
  dati.
- **SC-004**: Il 100% delle righe di persone già importate nello stesso anno da un altro elenco è saltato ed
  elencato; 0 persone hanno due adesioni nello stesso anno.
- **SC-005**: L'anteprima di ciascun file finto indica l'elenco corretto (3 su 3).
- **SC-006**: Gli utenti non autorizzati non riescono mai a leggere o scrivere i dati di alcun elenco (verificato dai
  test delle regole di sicurezza).

## Assumptions

- Gli export Giovani e Adulti hanno la stessa struttura e gli stessi difetti dell'ACR (verificato sull'export 2026).
- Nell'export reale il file coincide con la colonna `Settore`: il settore prevalente identifica l'elenco senza
  ambiguità.
- Nei file finti nessuna persona compare in due elenchi; il caso è coperto da test con dati sintetici.
- La schermata "Importa Excel" della 004 diventa unica per i tre elenchi (non tre schermate).
- Revisione dei possibili duplicati (006), famiglie (007), riconferma e quote (008–010) e ricalcolo delle fasce
  (011) sono fuori ambito.
