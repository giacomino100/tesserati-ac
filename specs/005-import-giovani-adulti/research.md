# Research: Import Giovani e Adulti

## R1. Riconoscimento dell'elenco

- **Decision**: funzione pura `recognizeList(sectors)`: conta i settori puliti in maiuscolo delle righe di dati;
  prende i più frequenti. Un solo più frequente e noto → `recognized` (`RAGAZZI` → `ACR`, `GIOVANI` → `GIOVANI`,
  `ADULTI` → `ADULTI`); più di uno e tutti noti → `tie` con i candidati (l'utente sceglie, chiarimento); almeno uno
  sconosciuto tra i più frequenti, o nessun settore → errore `unknownList`.
- **Rationale**: decisione 1 del brief e chiarimento della spec; nei file reali il settore coincide con il file.
- **Alternatives considered**: nome del file (inaffidabile, l'utente può rinominarlo); tre pulsanti (scartato nella
  revisione).

## R2. Segno di import per elenco

- **Decision**: ID `{anno}-{ELENCO}` con `ELENCO` ∈ `ACR`, `GIOVANI`, `ADULTI`; campo `source` = elenco. Il formato
  ACR resta identico alla 004 (`2026-ACR`).
- **Rationale**: la 004 lo aveva previsto (research R7 della 004); nessun dato da migrare.
- **Alternatives considered**: un solo segno per anno con l'elenco in un array (richiederebbe `update`, che le
  regole oggi vietano, e rende più difficile la regola "una volta per elenco").

## R3. Persona già con un'adesione nell'anno

- **Decision**: in anteprima il backend fornisce le adesioni dell'anno (`personId → importId`); `planImport` salta
  la riga di una persona esistente con un'adesione dell'anno, con motivo `alreadyInYear` e l'elenco di provenienza.
  Le righe saltate di questo tipo compaiono già in anteprima. Nella transazione si rileggono le adesioni
  `{anno}_{personId}` delle persone riusate: se una è comparsa nel frattempo, la transazione si ferma con
  `ImportContextChangedError` ("I dati sono cambiati: ricarica il file"). Le regole negano comunque la seconda
  adesione (un `set` su un documento esistente è un `update`, vietato).
- **Rationale**: decisione 2 del brief; una sola adesione per persona per anno (constitution IV).
- **Alternatives considered**: sovrascrivere l'adesione (perderebbe il settore originale); tenerne due (vietato
  dall'ID).

## R4. Contesto dell'anno in anteprima

- **Decision**: `ImportBackend.yearStatus` diventa `yearContext(year)` → `{ hasFeeSchedule, importedLists,
  persons: Map<identityKey, personId>, adhesions: Map<personId, AdhesionList> }`. Il servizio lo carica dopo la
  lettura del file e prima dell'anteprima; `planImport` gira già in anteprima, così righe saltate e totali sono
  quelli definitivi.
- **Rationale**: nella 004 il piano si calcolava solo alla conferma; ora le righe saltate dipendono dall'archivio e
  la spec vuole vederle in anteprima.

## R5. Regole Firestore

- **Decision**: `importBatches`: `batchId == string(anno) + '-' + source` e `source in ['ACR','GIOVANI','ADULTI']`.
  `adhesions`: `importId.matches(string(anno) + '-(ACR|GIOVANI|ADULTI)')`. `persons`: invariato
  (`createdWithNewBatch(createdInImport)`). Tutto il resto come 004.
- **Rationale**: stessi vincoli, tre elenchi; nessuna lettura aggiuntiva nelle regole.

## R6. "Anno con adesioni" dei listini

- **Decision**: `isInUse(anno)` = query `importBatches where associationYear == anno limit 1` non vuota.
- **Rationale**: FR-011; indice a campo singolo automatico.

## R7. Totali per settore

- **Decision**: calcolati in pagina dalle righe già caricate; etichette `RAGAZZI` → "ACR", `GIOVANI` → "Giovani",
  `ADULTI` → "Adulti", altri settori col nome dell'export; ordine ACR, Giovani, Adulti, altri; solo i settori presenti.
- **Rationale**: decisione 4 del brief; nessuna lettura in più.
