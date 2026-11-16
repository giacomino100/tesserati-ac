# Tesseramento AC San Gioacchino Constitution

## Core Principles

### I. Il dominio è la fonte di verità

- Le regole di business stanno in `docs/dominio/` e prevalgono su qualunque assunzione
  di specifiche, piani o codice.
- Le regole delle quote sono **esclusivamente** quelle del PDF ufficiale dell'anno
  (`docs/dominio/fonti/`), riportate in `docs/dominio/regole-quote.md`. Il sistema MUST NOT
  introdurre sconti, arrotondamenti, priorità o interpretazioni non scritte lì.
- Un caso non coperto dalle regole MUST essere segnalato come "non previsto" e lasciato alla
  decisione di una persona; il sistema MUST NOT inventare un risultato.
- Se durante specifica, piano o sviluppo emerge un'ambiguità di dominio, si aggiorna prima
  `docs/dominio/` (con conferma di chi gestisce il tesseramento), poi il resto.

Motivazione: l'app sostituisce un processo che la parrocchia già conosce; ogni regola
"inventata" produce quote sbagliate e perdita di fiducia.

### II. Calcolo quote puro e testato (NON-NEGOTIABLE)

- Il calcolo di fasce, quote e pacchetti familiari MUST vivere in una libreria TypeScript
  separata, senza dipendenze da Angular, Firebase o dal browser.
- Le funzioni di calcolo MUST essere pure: stesso input (componenti del nucleo + listino
  dell'anno) → stesso output; nessun accesso a rete, database o data corrente implicita.
- Ogni esempio di `docs/dominio/regole-quote.md` MUST esistere come test automatico con lo
  stesso totale atteso; i test si scrivono prima dell'implementazione e MUST fallire prima di
  passare.
- Importi e quote scontate MUST essere letti dal listino, mai calcolati con percentuali o
  arrotondamenti nel codice. Gli importi si rappresentano in centesimi interi.

Motivazione: è la parte più delicata e l'unica che produce soldi da chiedere alle famiglie.

### III. Riservatezza dei dati dei tesserati (NON-NEGOTIABLE)

- I dati trattati includono minori. Ogni lettura o scrittura MUST richiedere un utente
  autenticato e autorizzato secondo i ruoli di `docs/dominio/utenti.md`.
- Le Firestore Security Rules MUST negare tutto per impostazione predefinita e MUST essere
  coperte da test sull'emulatore Firebase.
- Dati reali (export, nomi, codici fiscali) MUST NOT entrare nel repository, nei test, nei
  log o nello sviluppo locale; si usano solo i dati finti di `docs/dominio/excel-esempio/`.
- Si importano solo le colonne necessarie: quelle marcate come escluse in
  `docs/dominio/excel-esempio/README.md` MUST NOT essere salvate.

Motivazione: obblighi GDPR e fiducia delle famiglie.

### IV. Storico per anno associativo

- Ogni anno associativo ha le proprie adesioni, il proprio listino e le proprie quote calcolate.
- Le adesioni e le quote di un anno chiuso MUST NOT cambiare quando cambiano listino, regole
  o anagrafica degli anni successivi.
- L'anagrafica della persona è condivisa tra gli anni; ciò che dipende dall'anno (fascia,
  nucleo, quota, riconferma) è legato all'adesione dell'anno.

Motivazione: lo scopo dell'app è riusare l'anno precedente; deve restare consultabile così
com'era.

### V. Semplicità e specifiche dimostrabili

- Ogni specifica MUST essere dimostrabile da sola con una frase ("carico l'Excel ACR e vedo i
  tesserati salvati") e consegnata in un branch e una PR dedicati.
- Nessuna libreria, servizio o astrazione senza una specifica concreta che la richieda (YAGNI).
- Servizi a pagamento o con piano Blaze (es. Cloud Functions) MUST essere giustificati nel
  piano della specifica che li introduce.

Motivazione: progetto parrocchiale mantenuto da volontari; ciò che non serve è costo e rischio.

## Vincoli tecnologici

- **Frontend**: Angular (ultima versione stabile), componenti standalone e signals,
  Angular Material per l'interfaccia.
- **Backend**: Firebase — Authentication, Cloud Firestore, Hosting. Nessun server proprio.
- **Linguaggio**: TypeScript in modalità `strict` in tutto il progetto.
- **Excel**: lettura lato client con SheetJS, con anteprima prima del salvataggio.
- **Test**: Vitest per logica e componenti; Firebase Emulator Suite per Security Rules e
  accesso ai dati.
- **Ambienti**: un solo progetto Firebase (produzione), che contiene i dati reali. Sviluppo e
  test usano la Firebase Emulator Suite in locale con i soli dati finti; nessuna modifica a
  Security Rules o struttura dati va pubblicata senza aver passato i test sull'emulatore.
- **Lingua**: interfaccia utente in italiano; codice, identificatori e messaggi di commit in
  inglese; documentazione di dominio e specifiche in italiano.

## Flusso di sviluppo e controlli di qualità

- Ciclo per ogni specifica: brief in `docs/brief/` → `/speckit-specify` → `/speckit-clarify` →
  `/speckit-plan` → `/speckit-tasks` → `/speckit-analyze` → revisione → `/speckit-implement`.
- La specifica (`spec.md`) MUST essere riletta da chi gestisce il tesseramento prima di
  `/speckit-plan` per le parti che toccano regole di dominio.
- Una PR può essere unita solo se: tutti i test passano, il type-check `strict` non ha errori,
  i test delle Security Rules passano, e `docs/roadmap.md` è aggiornata.
- Ogni PR elenca a quali principi di questa constitution è soggetta e come li rispetta.

## Governance

- Questa constitution prevale su ogni altra pratica del progetto. In caso di conflitto tra
  constitution e `docs/dominio/`, si risolve aggiornando esplicitamente uno dei due.
- Emendamenti: tramite PR che modifica questo file con `/speckit-constitution`, motivazione e,
  se serve, piano di adeguamento del codice esistente.
- Versionamento semantico: MAJOR per principi rimossi o ridefiniti in modo incompatibile;
  MINOR per principi o sezioni nuove o ampliate; PATCH per chiarimenti e correzioni.
- Verifica: il "Constitution Check" di `/speckit-plan` e `/speckit-analyze` MUST risultare
  senza violazioni non giustificate prima di `/speckit-implement`.

**Version**: 1.1.0 | **Ratified**: 2026-11-16 | **Last Amended**: 2026-11-16
