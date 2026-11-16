# Feature Specification: Accesso riservato

**Feature Branch**: `001-accesso-riservato`

**Created**: 2026-11-17

**Status**: Draft

**Input**: Brief `docs/brief/001-accesso-riservato.md` — l'app si apre solo dopo l'accesso con un
account Google e solo per gli indirizzi email dell'elenco autorizzato; chiunque altro non vede né
modifica alcun dato.

**Regole di riferimento**: `docs/dominio/utenti.md` (un solo ruolo, accesso con account Google,
elenco di email autorizzate); constitution, principio III (riservatezza dei dati dei tesserati).

## Clarifications

### Session 2026-11-17

- Q: Per quanto tempo un utente resta entrato sullo stesso dispositivo senza rifare l'accesso? → A: 7 giorni dall'ultimo accesso con Google, poi si rifà l'accesso.
- Q: Un tentativo di accesso da parte di chi non è in elenco deve lasciare una traccia? → A: No, nessuna traccia: il tentativo non salva nulla.
- Q: Un account Google di lavoro o scuola (non @gmail.com) con email in elenco può entrare? → A: Sì: vale qualunque account Google la cui email, verificata, è in elenco.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Accesso di un utente autorizzato (Priority: P1)

Una persona della segreteria apre l'app dal PC o dal telefono, sceglie "Accedi con Google" e, se
il suo indirizzo email è nell'elenco autorizzato, entra e vede la pagina iniziale con il proprio
nome e il pulsante "Esci".

**Why this priority**: senza questo passaggio nessuna funzione dell'app è utilizzabile; è anche lo
scheletro su cui si appoggiano tutte le specifiche successive.

**Independent Test**: con un utente di prova presente nell'elenco, si accede e si verifica che
compaiano pagina iniziale, nome e pulsante "Esci"; non servono altre funzionalità.

**Acceptance Scenarios**:

1. **Given** una persona non ancora autenticata, **When** apre l'app, **Then** vede solo la pagina
   di accesso con il pulsante "Accedi con Google" e nessun dato dei tesserati.
2. **Given** una persona con email nell'elenco autorizzato, **When** accede con il proprio account
   Google, **Then** entra nella pagina iniziale e vede il proprio nome e il pulsante "Esci".
3. **Given** una persona entrata da meno di 7 giorni, **When** ricarica la pagina o riapre
   l'app, **Then** resta autenticata senza dover accedere di nuovo; **When** invece sono
   passati più di 7 giorni dall'ultimo accesso con Google, **Then** deve accedere di nuovo.
4. **Given** una persona entrata, **When** sceglie "Esci", **Then** torna alla pagina di accesso e
   per rientrare deve accedere di nuovo.
5. **Given** un utente autorizzato, **When** usa l'app da un telefono, **Then** accesso, pagina
   iniziale e uscita sono utilizzabili senza scorrimenti orizzontali né elementi tagliati.

---

### User Story 2 - Rifiuto di chi non è autorizzato (Priority: P1)

Una persona con un account Google valido ma con email non presente nell'elenco prova ad accedere:
vede il messaggio "Accesso non autorizzato", non entra e non può leggere né scrivere alcun dato.

**Why this priority**: l'app tratta dati di minori; l'esclusione degli estranei è un requisito di
riservatezza, non un'opzione (constitution, principio III).

**Independent Test**: con un account di prova non presente nell'elenco, si tenta l'accesso e si
verifica sia il messaggio sia che nessun dato sia raggiungibile, anche provando ad accedere
direttamente ai dati senza passare dalla schermata.

**Acceptance Scenarios**:

1. **Given** un account Google con email non in elenco, **When** tenta di accedere, **Then** vede
   "Accesso non autorizzato" con la possibilità di uscire e provare con un altro account, e non
   entra nell'app.
2. **Given** un account non in elenco, **When** si tenta di leggere o scrivere dati dei tesserati
   senza passare dall'interfaccia, **Then** ogni operazione viene negata.
3. **Given** una persona non autenticata, **When** si tenta di leggere o scrivere dati, **Then**
   ogni operazione viene negata.
4. **Given** un utente entrato la cui email viene tolta dall'elenco, **When** prova a usare
   l'app o a leggere dati, **Then** non ottiene più alcun dato e vede "Accesso non autorizzato".

---

### Edge Cases

- L'email dell'account Google differisce dall'elenco solo per maiuscole/minuscole: vale come
  la stessa email.
- L'account Google ha un'email non verificata: l'accesso è negato.
- La persona chiude la finestra di accesso di Google senza completare: resta sulla pagina di
  accesso, senza errori bloccanti, e può riprovare.
- L'elenco è vuoto: nessuno entra.
- Mancanza di connessione durante l'accesso: messaggio comprensibile e possibilità di riprovare;
  nessun dato viene mostrato.
- Persona che apre un indirizzo interno dell'app (non la pagina iniziale) senza essere
  autenticata: viene portata alla pagina di accesso e, dopo l'accesso, entra nell'app.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Il sistema MUST mostrare a chi non è autenticato solo la pagina di accesso, senza
  alcun dato dei tesserati.
- **FR-002**: Il sistema MUST permettere l'accesso con un account Google di qualunque tipo
  (personale, di lavoro o di scuola): conta solo che l'email, verificata, sia in elenco.
- **FR-003**: Il sistema MUST consentire l'ingresso solo agli indirizzi email presenti
  nell'elenco delle email autorizzate; il confronto non distingue maiuscole e minuscole.
- **FR-004**: Il sistema MUST rifiutare l'accesso, con il messaggio "Accesso non autorizzato",
  a ogni account Google con email non in elenco o non verificata.
- **FR-005**: Il sistema MUST negare qualsiasi lettura e scrittura di dati a chi non è
  autenticato o non è in elenco, indipendentemente dall'interfaccia usata per richiederla
  (principio III della constitution: "nega tutto" per impostazione predefinita).
- **FR-006**: Il sistema MUST verificare l'autorizzazione a ogni accesso ai dati: togliere
  un'email dall'elenco MUST far cessare subito l'accesso ai dati di quella persona, anche se è
  già entrata.
- **FR-007**: Il sistema MUST mostrare all'utente entrato la pagina iniziale con il proprio nome
  e un pulsante "Esci".
- **FR-008**: Il sistema MUST permettere di uscire e MUST richiedere un nuovo accesso per rientrare.
- **FR-009**: Il sistema MUST mantenere l'accesso tra un caricamento di pagina e l'altro per
  7 giorni dall'ultimo accesso con Google, a meno che la persona esca prima o perda
  l'autorizzazione; trascorsi i 7 giorni MUST richiedere un nuovo accesso con Google.
- **FR-010**: Le schermate di accesso, accesso negato e pagina iniziale MUST essere utilizzabili
  su PC e su telefono.
- **FR-011**: L'interfaccia MUST essere interamente in italiano, con messaggi d'errore
  comprensibili per chi non è esperto (accesso annullato, mancanza di connessione, accesso non
  autorizzato).
- **FR-012**: Il sistema MUST NOT salvare né mostrare dati dell'utente diversi da nome ed email
  forniti dall'account Google, e MUST NOT registrare nei log dati personali. In particolare, un
  tentativo di accesso da parte di chi non è in elenco MUST NOT lasciare alcuna traccia
  (nemmeno l'email o la data del tentativo).
- **FR-013**: L'elenco delle email autorizzate MUST essere gestito fuori dall'app (nessuna
  schermata di gestione in questa specifica) e MUST NOT essere modificabile da chi usa l'app.

### Key Entities

- **Utente autorizzato**: persona identificata dall'indirizzo email, presente nell'elenco; ha un
  solo ruolo (può fare tutto ciò che l'app offre).
- **Elenco delle email autorizzate**: insieme degli indirizzi email che possono entrare; è l'unica
  fonte di autorizzazione.
- **Sessione di accesso**: stato di una persona entrata, valido 7 giorni dall'ultimo accesso con
  Google, o finché non esce o non perde l'autorizzazione.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un utente autorizzato completa l'accesso in meno di 30 secondi, dalla pagina di
  accesso alla pagina iniziale.
- **SC-002**: Il 100% dei tentativi di leggere o scrivere dati da parte di account non in elenco o
  non autenticati viene negato, verificato da test automatici su un ambiente locale con soli dati finti.
- **SC-003**: Dopo la rimozione di un'email dall'elenco, quella persona non ottiene più alcun dato
  al primo accesso ai dati successivo.
- **SC-004**: Accesso, accesso negato e pagina iniziale sono utilizzabili da telefono (schermo
  di 360 px di larghezza) senza scorrimento orizzontale.
- **SC-005**: Chi non è in elenco vede "Accesso non autorizzato" entro 5 secondi dal tentativo.

## Assumptions

- Gli utenti sono 2–5 persone che usano PC e telefono, con un account Google personale.
- Ruolo unico: ogni utente autorizzato può fare tutto; ruoli distinti sono fuori ambito.
- L'elenco delle email è mantenuto dalla persona che gestisce il progetto, fuori dall'app; il suo
  inserimento iniziale (almeno un indirizzo) è un passo di avvio dell'ambiente.
- Questa specifica crea anche lo scheletro dell'applicazione (pagina iniziale vuota) su cui
  appoggiano le specifiche successive; non contiene funzioni di tesseramento.
- Informativa privacy e titolare del trattamento sono da definire con la parrocchia
  (`docs/dominio/utenti.md`) e sono fuori ambito.
- Si usano la configurazione del progetto già disponibile e un solo progetto in produzione;
  sviluppo e test usano un ambiente locale con soli dati finti (constitution).
- Accesso con email e password, inviti via email e funzioni a pagamento sono fuori ambito.
