# Research: Listino per anno

**Feature**: [spec.md](./spec.md) · **Date**: 2026-11-17

## R1 – Dove stanno i listini

- **Decisione**: collezione Firestore `feeSchedules`, un documento per anno, **ID = anno di inizio come testo** (`"2026"`).
- **Motivazione**: l'anno come ID rende impossibile avere due listini per lo stesso anno (FR-006), permette alle regole di controllare l'anno precedente con `exists()`/`get()` (R3) e non richiede indici né interrogazioni complesse (2–10 documenti).
- **Alternative scartate**: ID automatici + campo anno (nessuna unicità garantita); un solo documento con tutti gli anni (conflitti di scrittura tra anni, viola IV).

## R2 – Forma del documento

- **Decisione**: stessa forma di `FeeSchedule` (specifica 002) — `associationYear`, `label`, `minAge`, `maxHouseholdSize`, `acrPackageCents`, `bands[4]` — più `updatedAt` (timestamp del server) e `updatedBy` (email in minuscolo). Dettaglio in [data-model.md](./data-model.md).
- **Motivazione**: FR-009 chiede la forma attesa dal calcolo; con la stessa forma il calcolo legge il listino senza conversioni (SC-005). I metadati sono due campi, nessuno storico (FR-016).
- **Alternative scartate**: sotto-collezione di revisioni (storico non richiesto, YAGNI).

## R3 – Le regole fanno rispettare le regole di dominio

- **Decisione**: la validazione sta **anche** nelle Security Rules, non solo nell'app, perché la spec esige che una richiesta diretta venga rifiutata (FR-013, edge case "anno diverso"). Le regole impongono:
  - **Creazione** dell'anno `Y` solo se `feeSchedules/Y-1` esiste, `feeSchedules/Y` non esiste e `associationYear == Y` (nessun anno saltato, nessun anno inventato; l'ID deve avere 4 cifre);
  - fasce d'età, età minima, massimo del nucleo e nomi delle fasce **uguali** a quelli del listino precedente (creazione) o a quelli già salvati (modifica);
  - forma esatta (solo i campi previsti, tipi corretti), importi interi `> 0`, quota con sconto `≤` quota piena, pacchetto `> 0`;
  - `updatedBy == email dell'utente in minuscolo` e `updatedAt == request.time`;
  - **nessuna cancellazione**.
- **Motivazione**: constitution, principi III e IV; senza queste regole un client modificato potrebbe saltare un anno, cambiare le fasce d'età o cancellare uno storico.
- **Limiti delle regole**: niente cicli (le 4 fasce si controllano una per una), al massimo 10 accessi a documenti per richiesta (qui ne servono circa 4: `isAllowed`, `exists`/`get` dell'anno precedente, `exists` dell'anno); **non** si può imporre in regole che `discountedCents` sia il 20% (e non si deve: la quota scontata è un valore del PDF).
- **Alternative scartate**: solo validazione nell'app (non rispetta FR-013); Cloud Functions (Blaze).

## R4 – Funzioni pure in `@tesseramento/fees`

- **Decisione**: aggiungere al pacchetto, senza dipendenze, `parseEuros`/`formatEuros` (virgola o punto, al massimo due decimali, niente separatore delle migliaia), la bozza in euro (`ScheduleDraft`) con `validateFeeSchedule`/`draftToSchedule` e gli errori per campo, `labelFor(anno)` (`2027` → `"2027/28"`), `nextAssociationYear(anni)` e `copyForNextYear(listino)`.
- **Motivazione**: principio II (la logica di importi e validazione è pura e testata) e riuso fra app e test. Il contratto pubblico del pacchetto cresce in modo additivo (vedi [contracts/fees-api-additions.md](./contracts/fees-api-additions.md)).
- **Alternative scartate**: validazione dentro i componenti Angular (non riusabile né testabile senza il browser).

## R5 – Collisione fra due utenti (FR-014)

- **Decisione**: il salvataggio di una modifica avviene in una **transazione** Firestore: si rilegge il documento, si confronta `updatedAt` con quello visto all'apertura; se diverso e l'utente non ha scelto "sovrascrivi" si interrompe con un conflitto, l'app mostra "Il listino è stato modificato da qualcun altro" con le due scelte (sovrascrivere / annullare e ricaricare).
- **Motivazione**: controllo ottimistico, adatto a 2–5 utenti, senza bloccare le modifiche. Il confronto sta nell'app, non nelle regole: la spec lascia comunque all'utente la scelta di sovrascrivere.
- **Alternative scartate**: blocco/lock di modifica (complessità e rischio di blocchi rimasti); ultimo-vince silenzioso (scartato nella chiarificazione).

## R6 – Inizializzazione del listino 2026/27

- **Decisione**: script `firebase/scripts/seed-fee-schedule.cjs` che scrive `feeSchedules/2026` leggendo `firebase/seed/fee-schedule-2026.json`, con le credenziali della CLI Firebase già autenticata (stessa tecnica usata per `allowedEmails`). Un test (`seed.test.ts`) verifica che il JSON coincida con `SCHEDULE_2026_27`, così c'è **una sola fonte** dei valori (il PDF, via `packages/fees`).
- **Motivazione**: il primo documento non può passare dalle regole (richiederebbe l'anno 2025). Lo script gira una volta, da chi mantiene il progetto.
- **Alternative scartate**: far creare il 2026 all'app (le regole lo vietano); duplicare i numeri a mano nello script (derive).

## R7 – Avviso "anno con adesioni" (FR-011)

- **Decisione**: interfaccia `ScheduleUsage.isInUse(anno): Promise<boolean>`; ora l'implementazione restituisce sempre `false`; i test la sostituiscono con `true` per verificare l'avviso. La specifica 004+ la sostituirà con un controllo reale sulle adesioni.
- **Motivazione**: la spec lo dichiara verificabile solo con le adesioni; l'interfaccia evita di cambiare la schermata dopo.

## R8 – Schermate e modulo

- **Decisione**: rotte `/listini` (elenco), `/listini/nuovo`, `/listini/:anno` (dettaglio con pulsante "Modifica"). Un componente modulo condiviso mostra le quote in euro (campi testo con tastiera numerica), errori accanto al campo, e le regole del PDF in sola lettura. Avviso di uscita con modifiche non salvate: `canDeactivate` + evento `beforeunload`. Si usano Material (campi, pulsanti, carta, tabella semplice) e i moduli reattivi di Angular già presenti.
- **Motivazione**: nessuna libreria nuova (principio V); 360 px come in 001.

## R9 – Test delle regole e prerequisito JDK

- **Decisione**: estendere `firebase/tests/rules.test.ts` con le guardie F1…F10 di [contracts/firestore-fee-schedules.md](./contracts/firestore-fee-schedules.md). Il JDK 21 va installato prima di implementare: senza, i test delle regole non girano e la constitution vieta di rilasciarle. Il test di seed e quelli di `fees` girano comunque senza JDK.
- **Motivazione**: le regole della 003 contengono logica; è il punto con più rischio di errori silenziosi.
