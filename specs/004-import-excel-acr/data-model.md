# Data Model: Import Excel ACR

## In memoria (pacchetto `@tesseramento/import`)

### ImportRow (riga valida)

| Campo | Tipo | Origine | Regole |
|---|---|---|---|
| `rowNumber` | number | posizione nel foglio | riga Excel (intestazione = 1) |
| `lastName` | string | `Cognome` | pulito, non vuoto |
| `firstName` | string | `Nome` | pulito, non vuoto |
| `sex` | `'M' \| 'F' \| undefined` | `Sesso` | altri valori → assente |
| `birthDate` | string `AAAA-MM-GG` | `Data Nascita` | data valida, obbligatoria |
| `taxCode` | string \| undefined | `Cod. Fiscale` | pulito, maiuscolo; vuoto o non di 16 caratteri alfanumerici → assente |
| `sector` | string | `Settore` | pulito, salvato com'è (es. `RAGAZZI`) |
| `exportAgeBand` | string \| undefined | `Fasce d'età` | pulito (es. `6/8`) |
| `bond` | string \| undefined | `Legame` | pulito (es. `C3`) |
| `bondId` | string \| undefined | `N. Legame` | numero → testo senza decimali; vuoto → assente |
| `identityKey` | string | calcolato | `COGNOME|NOME|AAAA-MM-GG`, maiuscolo, senza accenti, spazi singoli |

### SkippedRow

`{ rowNumber, reason }`, `reason` ∈ `missingLastName`, `missingFirstName`, `missingBirthDate`,
`invalidBirthDate`, `duplicate` (con `duplicateOf: rowNumber`).

### ParsedImport (esito di `parseAdhesionSheet`)

- `ok: true` → `{ associationYear, rows: ImportRow[], skipped: SkippedRow[], totalRows }`
- `ok: false` → `{ error }`, `error` ∈ `sheetNotFound`, `missingColumns` (con `columns: string[]`), `noRows`,
  `invalidYear`, `mixedYears`, `notAcr`, `allRowsSkipped`

### ImportPlan (esito di `planImport`)

`{ associationYear, importId: '2026-ACR', newPersons: ImportRow[], reusedPersons: { row, personId }[],
adhesions: number, skipped }` — una riga la cui `identityKey` esiste già in `persons` riusa quella persona.

## In Firestore

### `importBatches/{associationYear}-ACR`

| Campo | Tipo | Regole |
|---|---|---|
| `associationYear` | int | = anno nell'ID; esiste `feeSchedules/{anno}` |
| `source` | `'ACR'` | fisso in 004 |
| `importedAt` | timestamp | = `request.time` |
| `importedBy` | string | = email dell'utente in minuscolo |
| `adhesionCount` | int > 0 | |
| `newPersonCount` | int ≥ 0 | |
| `skippedRowCount` | int ≥ 0 | |

Solo creazione; nessuna modifica né cancellazione. Esistenza = "anno già importato" (ACR).

### `persons/{personId}` (ID automatico)

| Campo | Tipo | Regole |
|---|---|---|
| `lastName`, `firstName` | string non vuota | |
| `birthDate` | string | `^\d{4}-\d{2}-\d{2}$` |
| `identityKey` | string non vuota | |
| `sex` | `'M' \| 'F'` | opzionale |
| `taxCode` | string | opzionale, 16 caratteri alfanumerici maiuscoli |
| `createdInImport` | string | ID di un `importBatches` creato nella stessa scrittura |

Solo creazione (insieme a un nuovo segno di import); in 004 nessuna modifica né cancellazione. Nessun altro
campo ammesso (indirizzo, contatti, `Pagato`, `MLAC`/`MSAC`, colonne escluse).

### `adhesions/{associationYear}_{personId}`

| Campo | Tipo | Regole |
|---|---|---|
| `personId` | string | = parte finale dell'ID |
| `associationYear` | int | = parte iniziale dell'ID |
| `importId` | string | = `{associationYear}-ACR`, creato nella stessa scrittura |
| `sector` | string non vuota | come nell'export |
| `exportAgeBand` | string | opzionale |
| `bond` | string | opzionale |
| `bondId` | string | opzionale |

Solo creazione; una per persona per anno (ID); nessuna modifica né cancellazione.

## Relazioni e ciclo di vita

```text
importBatches/2026-ACR ──crea insieme── persons/* (solo nuove) + adhesions/2026_* 
persons/{id} 1 ── n adhesions/{anno}_{id}       (una per anno)
feeSchedules/{anno} deve esistere prima dell'import dell'anno
```

Stati della schermata: `idle → reading → preview | rejected → saving → done | saveFailed` (vedi
[contracts/app-routes.md](./contracts/app-routes.md)).
