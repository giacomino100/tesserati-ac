# @tesseramento/import

Trasformazione **pura** delle righe dell'elenco adesioni esportato dal sistema nazionale (specifica 004).
Nessuna dipendenza di runtime, nessun accesso a rete, browser, data corrente o log: riceve le righe del foglio
già estratte (l'app le legge con SheetJS) e restituisce righe pulite, righe saltate o un errore di file.

## API

| Funzione | Cosa fa |
|---|---|
| `parseAdhesionSheet({ sheetNames, rows, date1904 })` | foglio `ElencoAdesioniExcel` → `{ ok: true, associationYear, rows, skipped, totalRows }` oppure `{ ok: false, error }` |
| `planImport(parsed, existing)` | righe valide + persone già archiviate (chiave → ID) → persone nuove, persone riusate, numero di adesioni |
| `cleanText`, `toIsoDate`, `parseAssociationYear`, `identityKey` | pulizia di una cella, data di nascita "AAAA-MM-GG", "Anno 2026" → 2026, chiave COGNOME\|NOME\|DATA |
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
- **File rifiutato**: foglio mancante, colonne mancanti, nessuna riga, anno mancante o diverso tra le righe,
  nessuna riga con settore `RAGAZZI`, tutte le righe saltate.

## Test

```bash
npm test -w @tesseramento/import        # righe sintetiche + i tre file finti di docs/dominio/excel-esempio/
npm run typecheck -w @tesseramento/import
```

SheetJS è solo una devDependency, per leggere i file finti nei test. Solo dati finti.
