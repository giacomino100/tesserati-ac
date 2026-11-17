# Feature Specification: Listino per anno

**Feature Branch**: `003-listino-per-anno`

**Created**: 2026-11-17

**Status**: Draft

**Input**: Brief `docs/brief/003-listino-per-anno.md` — da una schermata dell'app gli utenti
autorizzati impostano il listino di un anno associativo (quote piene e scontate per fascia, pacchetto
2 ACR), partendo dall'anno precedente; il calcolo della quota famiglia legge il listino salvato.

**Regole di riferimento**: `docs/dominio/regole-quote.md` (listino 2026/27, fonte unica: il PDF);
specifica 002 (forma del listino letta dal calcolo); constitution, principi II, III e IV.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Vedere i listini degli anni (Priority: P1)

Un utente autorizzato apre la sezione "Listini" e vede l'elenco degli anni associativi che hanno un
listino. Per l'anno 2026/27 il listino esiste già con le quote ufficiali del PDF. Aprendo un anno
vede le quote in euro di ogni fascia (ACR, Giovanissimi, Giovani, Adulti) con quota piena e quota
con sconto del 20%, la quota del pacchetto 2 ACR, e le regole che il PDF fissa (fasce d'età, età
minima, numero massimo di componenti del nucleo).

**Why this priority**: è la base per tutto il resto: senza un listino leggibile dall'app il calcolo
della quota non può usare dati al posto del codice.

**Independent Test**: dopo l'accesso, si apre "Listini", si vede 2026/27 e si controlla che ogni
importo coincida con la tabella di `regole-quote.md` §1; non serve altro.

**Acceptance Scenarios**:

1. **Given** un utente autorizzato, **When** apre "Listini", **Then** vede l'elenco degli anni
   associativi con listino, dal più recente, e per ognuno l'etichetta (es. "2026/27").
2. **Given** il listino 2026/27, **When** lo apre, **Then** vede ACR 15,00 € / 12,00 €,
   Giovanissimi 16,00 € / 13,00 €, Giovani 22,00 € / 18,00 €, Adulti 26,00 € / 21,00 € e il
   pacchetto 2 ACR 25,00 €.
3. **Given** il listino 2026/27, **When** lo apre, **Then** vede anche le fasce d'età (6–14, 15–18,
   19–29, 30 e oltre), l'età minima 6 e il massimo di 4 componenti per nucleo, mostrati come regole
   del PDF non modificabili da questa schermata.
4. **Given** una persona non autenticata o non autorizzata, **When** prova ad aprire i listini,
   **Then** non vede nulla e nessun listino viene letto.

---

### User Story 2 - Creare il listino di un nuovo anno (Priority: P1)

Arriva il PDF delle quote del nuovo anno. L'utente sceglie "Nuovo listino", indica l'anno
associativo (es. 2027), e l'app propone una copia del listino dell'anno più recente. L'utente
corregge le quote in euro secondo il nuovo PDF e salva.

**Why this priority**: è la ragione d'essere della specifica: cambiare le quote ogni anno senza
modificare il codice.

**Independent Test**: si crea il listino 2027 copiando il 2026/27, si cambia una quota, si salva e
si riapre; il 2026/27 resta identico.

**Acceptance Scenarios**:

1. **Given** il listino 2026/27, **When** l'utente crea il listino 2027, **Then** i campi sono
   precompilati con le quote del 2026/27 e le regole del PDF (fasce d'età, età minima, massimo del
   nucleo) sono copiate senza poterle cambiare.
2. **Given** il modulo del nuovo listino, **When** l'utente cambia la quota Adulti da 26,00 a
   27,00 € e salva, **Then** il listino 2027 mostra 27,00 € e il listino 2026/27 mostra ancora 26,00 €.
3. **Given** un anno che ha già un listino, **When** si prova a crearne un altro per lo stesso
   anno, **Then** l'app lo impedisce e propone di aprire quello esistente.
4. **Given** il listino salvato, **When** il calcolo della quota famiglia lo legge, **Then**
   ottiene le stesse quote in centesimi interi che l'utente ha inserito, senza arrotondamenti
   propri (nessuna quota o percentuale resta nel codice).
5. **Given** l'anno 2027 e l'anno precedente più recente 2026/27, **When** si crea il listino
   2028 senza che esista il 2027, **Then** la copia parte dal listino dell'anno più recente
   esistente prima di quello indicato.

---

### User Story 3 - Correggere un listino esistente (Priority: P2)

L'utente nota un errore in un listino già salvato e lo corregge. Se ci sono già adesioni per
quell'anno, prima di salvare l'app mostra un avviso: le quote già calcolate restano quelle di prima
finché non vengono ricalcolate.

**Why this priority**: gli errori di battitura capitano; è meno frequente della creazione ma serve
una correzione senza interventi tecnici.

**Independent Test**: si modifica una quota del listino 2027, si salva e si verifica il nuovo
valore; l'avviso si verifica quando esisteranno adesioni (vedi Assumptions).

**Acceptance Scenarios**:

1. **Given** un listino salvato, **When** l'utente cambia una quota valida e salva, **Then** il
   nuovo valore viene mostrato alla riapertura.
2. **Given** un listino di un anno con adesioni già registrate, **When** l'utente sta per salvare
   una modifica, **Then** l'app mostra l'avviso "Le quote già calcolate per questo anno non cambiano
   finché non vengono ricalcolate" e chiede conferma.
3. **Given** la modifica del listino di un anno, **When** si salva, **Then** i listini degli altri
   anni restano invariati.

---

### Edge Cases

- Quota inserita con la virgola ("26,50") o con il punto ("26.50"): entrambe accettate come 26,50 €.
- Quota con più di due decimali ("26,555"), non numerica, vuota, zero o negativa: rifiutata con un
  messaggio chiaro accanto al campo, senza salvare.
- Quota scontata maggiore della quota piena: rifiutata.
- Pacchetto 2 ACR non positivo: rifiutato.
- Anno associativo non valido (non un anno di quattro cifre, o minore di 2026): rifiutato.
- L'utente chiude la pagina con modifiche non salvate: si perdono e l'app lo segnala prima di uscire
  se ci sono modifiche in sospeso.
- Due utenti modificano lo stesso listino quasi insieme: vale l'ultimo salvataggio; l'app avvisa se
  il listino è cambiato dopo che l'utente l'ha aperto.
- Nessun listino precedente (primo avvio): il listino 2026/27 è già presente con le quote del PDF.
- Mancanza di connessione al salvataggio: messaggio comprensibile; nulla viene salvato a metà.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Il sistema MUST mostrare agli utenti autorizzati l'elenco dei listini per anno
  associativo, dal più recente, e il dettaglio di ciascuno.
- **FR-002**: Il sistema MUST contenere fin dall'inizio il listino 2026/27 con i valori ufficiali del
  PDF (`regole-quote.md` §1).
- **FR-003**: Ogni listino MUST riportare, per le fasce ACR, Giovanissimi, Giovani e Adulti, la
  quota piena e la quota con sconto del 20%, la quota del pacchetto 2 ACR, le fasce d'età, l'età
  minima e il massimo di componenti del nucleo.
- **FR-004**: Il sistema MUST permettere di creare il listino di un nuovo anno associativo
  partendo da una copia del listino dell'anno più recente precedente a quello indicato.
- **FR-005**: Il sistema MUST permettere di modificare, in un listino, solo le quote in euro (piena
  e con sconto per fascia, pacchetto 2 ACR); fasce d'età, età minima e massimo del nucleo sono
  copiati e non modificabili da questa schermata.
- **FR-006**: Il sistema MUST validare i valori prima di salvare: quote presenti, positive, con al
  massimo due decimali; quota scontata non maggiore di quella piena; pacchetto 2 ACR positivo; anno
  di quattro cifre non inferiore a 2026; un solo listino per anno. In caso di errore MUST indicare
  quale campo e perché, senza salvare nulla.
- **FR-007**: Il sistema MUST salvare le quote in centesimi interi, senza arrotondamenti oltre quelli
  scritti dall'utente, e mostrarle in euro con due decimali.
- **FR-008**: Il sistema MUST accettare sia la virgola sia il punto come separatore decimale.
- **FR-009**: Il listino salvato MUST avere la forma attesa dal calcolo della quota famiglia della
  specifica 002, così che il calcolo lo legga senza conversioni di valore.
- **FR-010**: La creazione o la modifica del listino di un anno MUST NOT cambiare i listini degli
  altri anni (constitution, principio IV).
- **FR-011**: Se per l'anno esistono adesioni, il sistema MUST mostrare prima del salvataggio di una
  modifica l'avviso che le quote già calcolate non cambiano finché non vengono ricalcolate, e MUST
  chiedere conferma.
- **FR-012**: Il sistema MUST NOT permettere la cancellazione di un listino.
- **FR-013**: Solo gli utenti autorizzati MUST poter leggere e scrivere i listini, indipendentemente
  dall'interfaccia usata (constitution, principio III); chi non è autorizzato non ottiene alcun
  dato.
- **FR-014**: Il sistema MUST avvisare chi sta per lasciare la pagina con modifiche non salvate e,
  al salvataggio, avvisare se il listino è cambiato dopo l'apertura da parte di un altro utente.
- **FR-015**: L'interfaccia MUST essere in italiano e utilizzabile su PC e su telefono.

### Key Entities

- **Listino**: insieme delle quote di un anno associativo, identificato dall'anno di inizio (2026 =
  2026/27) e da un'etichetta ("2026/27"). Contiene le quote per fascia, il pacchetto 2 ACR e le
  regole fissate dal PDF.
- **Quota di fascia**: per ogni fascia (ACR, Giovanissimi, Giovani, Adulti) la quota piena e la
  quota con sconto del 20% scritta nel PDF, in centesimi interi, più le età comprese nella fascia.
- **Regole del listino**: età minima (sotto la quale un componente non è previsto), numero massimo
  di componenti del nucleo, quota del pacchetto 2 ACR.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un utente crea il listino di un nuovo anno (copia, modifica di tutte le quote, salvataggio)
  in meno di 3 minuti.
- **SC-002**: Il listino 2026/27 mostrato dall'app coincide al 100% con la tabella di
  `regole-quote.md` §1 (8 quote di fascia più il pacchetto).
- **SC-003**: Il 100% dei valori non validi elencati in FR-006 viene rifiutato prima del salvataggio,
  con il campo interessato indicato.
- **SC-004**: Dopo la creazione o la modifica di un listino, i listini degli altri anni restano
  identici (verificato confrontando tutti i valori prima e dopo).
- **SC-005**: Le quote che il calcolo della quota famiglia ottiene dal listino salvato coincidono
  per ogni esempio di `regole-quote.md` §3 con i totali attesi, usando il listino letto dall'archivio
  invece di quello scritto nel codice.
- **SC-006**: Un accesso non autorizzato ai listini (lettura o scrittura) viene negato nel 100% dei
  casi, verificato con test automatici su un ambiente locale con soli dati finti.
- **SC-007**: Le schermate dei listini sono utilizzabili da telefono (schermo di 360 px) senza
  scorrimento orizzontale.

## Assumptions

- L'anno associativo si indica con l'anno di inizio (2026 = 2026/27), come già in `regole-quote.md`.
- Gli utenti sono quelli della specifica 001 (ruolo unico): chiunque sia autorizzato può creare e
  correggere i listini.
- Il listino 2026/27 viene inserito all'avvio con i valori del PDF; è l'unico listino all'inizio.
- Fasce d'età, età minima e numero massimo di componenti sono regole del PDF e per ora si copiano
  dall'anno precedente; modificarli richiede una specifica a parte.
- Al momento di questa specifica non esistono adesioni (arrivano con le specifiche 004 e seguenti):
  l'avviso di FR-011 sarà verificabile solo quando esisteranno; si verifica nel frattempo con un
  indicatore di prova nei test.
- Il ricalcolo automatico delle quote già calcolate, l'import del listino dal PDF e la cancellazione
  sono fuori ambito.
- L'integrazione con il calcolo della quota famiglia (leggere il listino dall'archivio invece del
  listino scritto nel codice) è parte di questa specifica solo nella forma del listino salvato
  (FR-009, SC-005); l'uso nelle schermate di quota arriva con la specifica 010.
- Un solo progetto in produzione; sviluppo e test su ambiente locale con soli dati finti.
