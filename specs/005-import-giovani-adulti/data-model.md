# Data Model: Import Giovani e Adulti

Base: [data model della 004](../004-import-excel-acr/data-model.md). Qui solo le differenze.

## In memoria (`@tesseramento/import`)

- **AdhesionList** = `'ACR' | 'GIOVANI' | 'ADULTI'`; settore dell'export corrispondente: `RAGAZZI`, `GIOVANI`,
  `ADULTI`. Etichetta: "ACR", "Giovani", "Adulti".
- **ListRecognition** = `{ kind: 'recognized', list }` | `{ kind: 'tie', candidates: AdhesionList[] }`.
- **ParsedImportOk** + `recognition: ListRecognition`.
- **ImportError**: `notAcr` è sostituito da `unknownList`.
- **SkipReason** + `alreadyInYear`; **SkippedRow** + `fromList?: AdhesionList` (per `alreadyInYear`).
- **ImportPlan** + `list: AdhesionList`; `importId` = `{anno}-{list}`; `skipped` include anche le righe
  `alreadyInYear`; `adhesions` = righe valide meno quelle `alreadyInYear`.

## In Firestore

| Collezione | Cambia | Regola |
|---|---|---|
| `importBatches/{anno}-{ELENCO}` | `source` ∈ `ACR`, `GIOVANI`, `ADULTI`; ID con l'elenco | creazione solo se non esiste: un elenco per anno |
| `persons/{id}` | `createdInImport` può essere `{anno}-GIOVANI` o `{anno}-ADULTI` | invariata |
| `adhesions/{anno}_{personId}` | `importId` = `{anno}-{ELENCO}` | una per persona per anno, qualunque elenco |

Nessun nuovo campo, nessuna migrazione.

## Contesto dell'anno (app)

`YearContext` = `{ hasFeeSchedule: boolean, importedLists: AdhesionList[], persons: Map<identityKey, personId>,
adhesions: Map<personId, AdhesionList> }` (adesioni dell'anno, elenco ricavato da `importId`).

## Stati della schermata di import

Come 004, più: in `preview` con `recognition.kind === 'tie'` l'utente sceglie l'elenco (`chosenList`);
"Importa" è attivo solo con un elenco definito. Il piano si ricalcola alla scelta.
