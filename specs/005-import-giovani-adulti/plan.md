# Implementation Plan: Import Giovani e Adulti

**Branch**: `005-import-giovani-adulti` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-import-giovani-adulti/spec.md`

## Summary

L'import della 004 diventa generale per i tre elenchi. Nel pacchetto puro `@tesseramento/import` il controllo
"è l'ACR" diventa il **riconoscimento dell'elenco** dal settore più frequente (con parità da far scegliere
all'utente), e `planImport` salta le righe di persone che hanno già un'adesione nello stesso anno da un altro
elenco. Il segno di import diventa `importBatches/{anno}-{ELENCO}` (`ACR`, `GIOVANI`, `ADULTI`) e le regole Firestore
accettano i tre elenchi con gli stessi vincoli della 004. In anteprima l'app carica il "contesto dell'anno"
(listino, elenchi già importati, persone, adesioni dell'anno) e la transazione di salvataggio lo ricontrolla. La
pagina Tesserati aggiunge i totali per settore; l'avviso "anno con adesioni" dei listini guarda qualsiasi elenco.

## Technical Context

**Language/Version**: TypeScript `~6.0` in modalità `strict`; Node.js 24.x (≥ 22.22.3)

**Primary Dependencies**: nessuna nuova (SheetJS 0.20.3, `@angular/*` 22.2, `@angular/material`, `firebase` 13.4,
`@tesseramento/fees`, `@tesseramento/import`)

**Storage**: Cloud Firestore, collezioni della 004 (`importBatches`, `persons`, `adhesions`); nessun nuovo indice

**Testing**: Vitest (pacchetto e app), Firebase Emulator Suite per regole e integrazione (JDK 21)

**Target Platform**: browser moderni su PC e telefono (360 px), Firebase Hosting

**Project Type**: web application (modifica `packages/import`, `apps/web`, `firebase/`)

**Performance Goals**: anteprima entro 5 s come in 004; transazione ≤ 500 scritture (Adulti reale: 60 righe)

**Constraints**: come 004 (file solo nel browser, nessun log di dati, solo colonne necessarie, nessuna Function);
nessun dato in produzione da migrare (la 004 è rilasciata ma non ancora usata)

**Scale/Scope**: 3 elenchi per anno, ~165 adesioni reali per anno; nessuna schermata nuova

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Valutazione | Note |
|---|---|---|
| I. Dominio fonte di verità | ✅ | Elenco = settore dell'export (README); settore e fascia salvati come nell'export; i trentenni non vengono ricalcolati (fuori ambito, 010/011) |
| II. Calcolo quote puro e testato | ✅ n/a | Nessun calcolo di quote; riconoscimento dell'elenco e righe già presenti restano funzioni pure testate |
| III. Riservatezza (NON-NEGOTIABLE) | ✅ | Stesse colonne della 004; regole estese ai tre elenchi e testate per ciascuno; nessun nuovo dato personale |
| IV. Storico per anno | ✅ | Una adesione per persona per anno (ID `{anno}_{personId}`); un elenco per anno si importa una volta; nulla di già importato viene modificato |
| V. Semplicità | ✅ | Nessuna libreria nuova; riuso di schermate, pacchetto e collezioni della 004 |

**Esito**: nessuna violazione. **Ri-verifica dopo la fase 1**: invariata.

## Project Structure

### Documentation (this feature)

```text
specs/005-import-giovani-adulti/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── import-api-changes.md     # modifiche all'API pura di @tesseramento/import
│   ├── firestore-import-changes.md
│   └── app-changes.md            # schermata di import e pagina Tesserati
└── tasks.md
```

### Source Code (repository root)

```text
packages/import/src/
├── lists.ts            # NUOVO: elenchi, settore ↔ elenco, recognizeList
├── parse-sheet.ts      # notAcr → riconoscimento elenco (recognized | tie | unknownList)
├── plan-import.ts      # elenco scelto, adesioni già presenti nell'anno → righe saltate "alreadyInYear"
└── types.ts            # AdhesionList, SkipReason 'alreadyInYear', ImportPlan.list

firebase/
├── firestore.rules     # importBatches/{anno}-{ELENCO}; importId di adesioni e persone per i tre elenchi
└── tests/rules.test.ts # + sezione I12–I16 (Giovani, Adulti, convivenza, doppia adesione)

apps/web/src/app/
├── importa/            # contesto dell'anno, scelta dell'elenco in parità, messaggi con l'elenco, transazione
├── tesserati/          # totali per settore
└── listini/schedule-usage.ts  # qualsiasi import dell'anno
```

**Structure Decision**: nessuna struttura nuova; si generalizza il codice della 004 lasciando l'API compatibile
dove possibile (`acrImportId` resta come scorciatoia di `importId(year, 'ACR')`).

## Complexity Tracking

| Rischio | Perché è tracciato | Mitigazione |
|---|---|---|
| Regole già in produzione con `-ACR` fisso | Le nuove regole cambiano il formato accettato | Il formato ACR resta identico (`{anno}-ACR`, `source 'ACR'`): nessun dato da migrare; test I1–I11 della 004 restano verdi |
| Persona importata da un altro elenco tra anteprima e conferma | La lettura del contesto avviene fuori dalla transazione | La transazione rilegge le adesioni dell'anno delle persone riusate e il segno dell'elenco; le regole negano comunque una seconda adesione (create su documento esistente) |
