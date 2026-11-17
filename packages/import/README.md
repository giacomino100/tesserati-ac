# @tesseramento/import

Trasformazione **pura** delle righe dell'elenco adesioni esportato dal sistema nazionale (specifica 004).
Unica dipendenza `@tesseramento/fees` (pura, dalla 006); nessun accesso a rete, browser, data corrente o log: riceve le righe del foglio
già estratte (l'app le legge con SheetJS) e restituisce righe pulite, righe saltate o un errore di file.

## API

| Funzione | Cosa fa |
|---|---|
| `parseAdhesionSheet({ sheetNames, rows, date1904 })` | foglio `ElencoAdesioniExcel` → `{ ok: true, associationYear, rows, skipped, totalRows }` oppure `{ ok: false, error }` |
| `planImport(parsed, list, existingPersons, adhesionsOfYear?, decisions?, renewedIds?)` | righe valide + elenco + persone già archiviate (chiave → ID) + adesioni dell'anno (ID persona → elenco) → persone nuove, persone riusate, righe già importate nell'anno, numero di adesioni; con `manualIds` le persone già **riconfermate** (008) o **inserite a mano** (009) nell'anno sono saltate con il motivo `alreadyRenewed` / `alreadyAdded` |
| `validateNewMember(input, year)`, `matchNewMember(member, year, archive, yearIds, previousYearIds)`, `resolveSimilar(...)` | modulo "Nuovo tesserato" (specifica 009): campi puliti come nell'import con errori per campo; ricerca in archivio (stesso codice fiscale o chiave → persona esistente, simili di §2 → da decidere, adesione nell'anno precedente → riconferma, nell'anno → già iscritta) |
| `recognizeList(sectors)`, `ADHESION_LISTS`, `sectorOf`, `listLabel`, `importId`, `listOfImportId` | elenchi ACR / Giovani / Adulti (specifica 005): riconoscimento dal settore più frequente o parità, ID del segno ("2026-GIOVANI") |
| `listOfAdhesion(importId?, list?)` | elenco di un'adesione: il campo `list` se c'è (riconferma, nuovo tesserato, cambio di elenco della 011), altrimenti dal segno di import |
| `cleanText`, `toIsoDate`, `parseAssociationYear`, `identityKey` | pulizia di una cella, data di nascita "AAAA-MM-GG", "Anno 2026" → 2025 (l'export `Anno N` è l'anno associativo (N−1)/N, specifica 008), chiave COGNOME\|NOME\|DATA |
| `REQUIRED_COLUMNS`, `EXPECTED_SHEET`, `acrImportId` | colonne lette, nome del foglio, ID del segno di import ("2026-ACR") |

Tipi e campi: `specs/004-import-excel-acr/data-model.md`; contratto e casi di prova P1–P14:
`specs/004-import-excel-acr/contracts/import-api.md`.

## Regole principali (research R3–R6)

- **Solo colonne necessarie** (constitution III): cognome, nome, sesso, data di nascita, codice fiscale (solo se
  di 16 caratteri), settore, fascia d'età dell'export, legame, N. legame, anno. Le altre colonne non vengono mai
  copiate nell'oggetto riga.
- **Colonne per nome**: ordine e colonne in più non contano; se ne manca una necessaria il file è rifiutato con
  l'elenco delle colonne mancanti.
- **Pulizia**: spazi iniziali, finali e doppi; cella vuota, `''` e la stringa `''` (due apici) sono "vuoto";
  `N. Legame` numerico diventa testo senza decimali.
- **Date**: seriali Excel (sistema 1900 o 1904) o testi `GG/MM/AAAA` / `AAAA-MM-GG`, convertiti con aritmetica
  intera, senza `Date` né fuso orario.
- **Righe saltate**: senza cognome, nome o data di nascita (o data non valida) e duplicati della stessa
  identità (si tiene la prima). Il resto del file si importa.
- **Elenco** (specifica 005): il settore più frequente (`RAGAZZI` → ACR, `GIOVANI`, `ADULTI`); in parità tra
  elenchi noti l'utente sceglie; le righe di altri settori si importano con il loro settore.
- **Già nell'anno** (specifica 005): una persona che ha già un'adesione nello stesso anno da un altro elenco è
  saltata (`alreadyInYear`, con l'elenco di provenienza): una sola adesione per persona per anno.
- **Identità e doppioni** (specifica 006, `regole-famiglia.md` §2): per ogni riga, nell'ordine, codice fiscale in
  archivio (prevale) → chiave cognome + nome + data → **possibile doppione** (`findCandidates`: stessa data e cognome
  con nome entro 2 lettere o contenuto come parola intera; oppure stesso cognome e nome con data entro una cifra o
  giorno/mese scambiati) da decidere con `decisions` ("Stessa persona" = ID, "Persona diversa" = `'new'`) → persona
  nuova. Finché `pendingDuplicates > 0` non si importa. Le righe saltate portano cognome e nome solo in memoria.
- **Avvisi** (`ageWarnings`, specifica 006): età sotto il minimo del listino o settore dell'export diverso dalla
  fascia del listino; non bloccano. Età e fasce vengono da `@tesseramento/fees` (unica dipendenza, anch'essa pura).
- **File rifiutato**: foglio mancante, colonne mancanti, nessuna riga, anno mancante o diverso tra le righe,
  elenco non riconoscibile (settore sconosciuto tra i più frequenti), tutte le righe saltate.

## Test

```bash
npm test -w @tesseramento/import        # righe sintetiche + i tre file finti di docs/dominio/excel-esempio/
npm run typecheck -w @tesseramento/import
```

SheetJS è solo una devDependency, per leggere i file finti nei test. Solo dati finti.
