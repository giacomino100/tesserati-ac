# Research: Import Excel ACR

## R1. Libreria per leggere l'Excel

- **Decision**: SheetJS Community Edition 0.20.3 installata dal tarball ufficiale
  `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`, caricata con `import()` dinamico solo nella pagina di
  import.
- **Rationale**: la constitution impone SheetJS; il pacchetto `xlsx` su npm è fermo a 0.18.5 (vulnerabilità
  note: prototype pollution, ReDoS) e SheetJS distribuisce le versioni nuove solo dal proprio CDN. Il caricamento
  dinamico tiene la libreria (~400 KB) fuori dal bundle iniziale.
- **Alternatives considered**: `xlsx` 0.18.5 da npm (vulnerabile); ExcelJS (più pesante, non prevista dalla
  constitution); lettura manuale dello zip XML (troppo fragile).

## R2. Dove vive la trasformazione delle righe

- **Decision**: nuovo pacchetto `@tesseramento/import` senza dipendenze di runtime. Riceve le righe del foglio
  già estratte (`unknown[][]`, prima riga = intestazioni) e il flag `date1904`; restituisce un risultato
  strutturato. SheetJS è solo devDependency per i test sui file finti.
- **Rationale**: logica con molte regole (pulizia, date, duplicati, righe saltate) facile da testare senza
  browser né Firebase; riuso diretto nella 005 (stessa struttura per Giovani e Adulti).
- **Alternatives considered**: tutto nell'app (test più lenti, meno riusabile); dentro `@tesseramento/fees`
  (mescolerebbe due responsabilità e la constitution vuole il calcolo isolato).

## R3. Colonne e foglio

- **Decision**: foglio con nome `ElencoAdesioniExcel` obbligatorio. Le colonne necessarie si cercano per nome
  esatto dopo la pulizia degli spazi: `Anno Associativo`, `Cognome`, `Nome`, `Sesso`, `Data Nascita`,
  `Cod. Fiscale`, `Settore`, `Fasce d'età`, `Legame`, `N. Legame`. Ordine e colonne in più sono ignorati
  (chiarimento 2). Le altre colonne non vengono mai copiate nell'oggetto riga.
- **Rationale**: chiarimento della spec; "solo colonne necessarie" (principio III) garantito per costruzione.
- **Alternatives considered**: posizione fissa delle 33 colonne (rigida, rifiutata nel chiarimento).

## R4. Date di nascita

- **Decision**: leggere i valori grezzi (`raw: true`): le celle data sono numeri seriali Excel, convertiti in
  stringa `AAAA-MM-GG` con aritmetica pura (epoca 1899-12-30, o 1904 se il file lo dichiara), senza fusi orari.
  Accettati anche testi `GG/MM/AAAA` e `AAAA-MM-GG`; tutto il resto è "data di nascita non valida" e la riga è
  saltata. Si salva la stringa, non un timestamp.
- **Rationale**: `cellDates` di SheetJS crea `Date` locali e può spostare il giorno di un'unità secondo il fuso;
  una data di nascita è un giorno di calendario, non un istante.
- **Alternatives considered**: `Date`/Timestamp Firestore (rischio di giorno sbagliato a mezzanotte).

## R5. Pulizia e identità

- **Decision**: testi: trim + spazi multipli → uno; celle vuote, `null`, `''` e la stringa `''` (due apici)
  → vuoto. Cognome e nome salvati puliti come nell'export (maiuscolo). Chiave di identità =
  `COGNOME|NOME|AAAA-MM-GG` con maiuscolo, senza accenti (NFD), spazi normalizzati
  (`regole-famiglia.md` §2). `N. Legame` (numero) salvato come testo senza decimali; vuoto = nessun legame.
- **Rationale**: difetti elencati nel README; la chiave è quella proposta dal dominio.
- **Alternatives considered**: codice fiscale come chiave (assente nel 73% dei casi).

## R6. Righe saltate e file rifiutati

- **Decision**: righe saltate (chiarimento 1): cognome, nome o data di nascita mancanti o non validi; stessa
  chiave di una riga precedente (si tiene la prima). File rifiutato: foglio mancante, colonne mancanti, nessuna
  riga, anno mancante o non `Anno AAAA` o diverso tra le righe, nessuna riga con settore `RAGAZZI` ("non sembra
  l'elenco ACR"), tutte le righe saltate, anno senza listino, anno già importato.
- **Rationale**: un errore di riga non blocca il resto; un errore che riguarda tutto il file sì. Il controllo
  `RAGAZZI` evita di "consumare" l'import ACR dell'anno caricando per sbaglio l'elenco Giovani o Adulti.
- **Alternatives considered**: rifiutare tutto alla prima riga errata (scartato nel chiarimento 1).

## R7. Modello in Firestore

- **Decision**: tre collezioni. `importBatches/{anno}-ACR` (segno dell'import: anno, sorgente, data, email,
  conteggi); `persons/{id automatico}` (anagrafica + `identityKey` + `createdInImport`);
  `adhesions/{anno}_{personId}` (anno, settore, fascia export, legame, N. legame, `importId`).
- **Rationale**: anagrafica condivisa e adesione per anno (principio IV); l'ID dell'adesione impedisce due
  adesioni della stessa persona nello stesso anno; l'ID automatico della persona non mette dati personali negli
  ID. Il segno di import per sorgente permetterà alla 005 di importare Giovani e Adulti nello stesso anno: in
  questa specifica "l'anno ha già adesioni" coincide con "esiste `{anno}-ACR`".
- **Alternatives considered**: ID persona = hash della chiave (deterministico ma rigido se la 006 corregge un
  nome); sottocollezioni per anno (regole e query più complesse senza vantaggi a questa scala).

## R8. Tutto o niente e riimporto

- **Decision**: un'unica `runTransaction`: legge `importBatches/{anno}-ACR` (deve non esistere) e
  `feeSchedules/{anno}` (deve esistere), poi crea segno, persone nuove e adesioni. Le regole lo garantiscono
  anche lato server: segno solo `create`; persone e adesioni creabili solo se il segno indicato **non esiste
  prima** e **esiste dopo** la scrittura (`exists` / `existsAfter`). Le persone esistenti si leggono prima
  (query su tutta `persons`, poche centinaia di documenti) e non vengono modificate.
- **Rationale**: FR-014 e FR-011 con atomicità nativa; due import contemporanei dello stesso anno: il secondo
  fallisce per intero. Come nella 003 la transazione evita il "salvataggio infinito" offline (un `writeBatch`
  offline resta in attesa senza errore). Limite 500 scritture: ACR reale ≈ 179.
- **Alternatives considered**: `writeBatch` (nessun errore offline); scritture una per una (non atomiche).

## R9. Privacy nei log ed errori

- **Decision**: nessun `console.*` con righe o valori; gli errori Firestore si mappano a messaggi fissi in
  italiano; i messaggi di riga saltata mostrano numero di riga e motivo, non i dati.
- **Rationale**: SC-006 e principio III.

## R10. "Anno con adesioni" dei listini

- **Decision**: `ScheduleUsage.isInUse(anno)` diventa `exists(importBatches/{anno}-ACR)` (in 005: qualsiasi
  sorgente dell'anno). Rimosso l'indicatore di prova della 003.
- **Rationale**: lo stub della 003 era dichiarato in attesa della 004.
