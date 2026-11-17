# Implementation Plan: Import Excel ACR

**Branch**: `004-import-excel-acr` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-import-excel-acr/spec.md`

## Summary

Una nuova sezione **Importa** dell'app legge `ElencoAdesioni_ACR.xlsx` nel browser con SheetJS (caricato solo
su quella pagina), trasforma le righe con funzioni **pure** in un nuovo pacchetto `@tesseramento/import`
(colonne cercate per nome, pulizia dei testi, data di nascita, identità normalizzata, righe saltate e duplicati)
e mostra l'anteprima. Alla conferma una **transazione Firestore** scrive in un colpo solo il segno di import
`importBatches/{anno}-ACR`, le persone nuove (`persons`) e le adesioni dell'anno (`adhesions`): tutto o niente.
Le **regole di Firestore** sono la barriera: solo utenti autorizzati, un solo import ACR per anno, l'anno deve
avere un listino, persone e adesioni si creano solo insieme a un nuovo segno di import, campi limitati a quelli
necessari, niente modifiche né cancellazioni. Il controllo "anno con adesioni" dei listini (stub della 003)
diventa reale.

## Technical Context

**Language/Version**: TypeScript `~6.0` in modalità `strict`; Node.js 24.x (≥ 22.22.3)

**Primary Dependencies**: **nuova**: SheetJS Community Edition `xlsx` 0.20.3 dal CDN ufficiale
(`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`, prevista dalla constitution); già presenti:
`@angular/*` 22.2, `@angular/material`, `firebase` 13.4, `@tesseramento/fees`

**Storage**: Cloud Firestore, nuove collezioni `importBatches`, `persons`, `adhesions`; letta `feeSchedules`

**Testing**: Vitest (pacchetto `import` con i file Excel finti, app con backend finto); Firebase Emulator Suite
per regole (`npm run test:rules`) e integrazione (`npm run test:integration -w web`), JDK 21 già installato

**Target Platform**: browser moderni su PC e telefono (360 px), Firebase Hosting

**Project Type**: web application (estende `apps/web`, `firebase/`; nuovo `packages/import`)

**Performance Goals**: anteprima entro 5 s dalla scelta del file (SC-001); file da 15–200 righe

**Constraints**: il file non lascia il dispositivo; nessun dato personale nei log; solo colonne necessarie;
nessuna Cloud Function né piano Blaze; transazione ≤ 500 scritture (ACR reale: 89 adesioni + ≤ 89 persone + 1)

**Scale/Scope**: 2–5 utenti, un import ACR all'anno, 2 schermate nuove (Importa, Tesserati in sola lettura)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Valutazione | Note |
|---|---|---|
| I. Dominio fonte di verità | ✅ | Struttura, colonne e difetti da `excel-esempio/README.md`; identità da `regole-famiglia.md` §2; settore e fascia salvati come nell'export, nessuna fascia ricalcolata; nessuna famiglia inventata (solo `N. Legame`) |
| II. Calcolo quote puro e testato | ✅ n/a | Nessun calcolo di quote. Per coerenza anche la trasformazione delle righe è pura e testata prima (pacchetto senza dipendenze di runtime) |
| III. Riservatezza (NON-NEGOTIABLE) | ✅ | Lettura nel browser, nessun upload del file; salvati solo cognome, nome, sesso, data di nascita, codice fiscale se presente, settore, fascia dell'export, legame, N. legame; colonne escluse mai copiate nell'oggetto riga; regole "nega tutto" con test sull'emulatore; nessun `console.log` di righe; test solo con i file finti |
| IV. Storico per anno | ✅ | Persona condivisa (`persons`), adesione per anno (`adhesions/{anno}_{persona}`); un anno importato non si riimporta né si modifica; le persone esistenti non vengono toccate |
| V. Semplicità | ✅ | Una sola libreria nuova, imposta dalla constitution e caricata solo nella pagina di import; un pacchetto puro piccolo; nessuna Function |

**Esito**: nessuna violazione.

**Ri-verifica dopo la fase 1 (design)**: invariata. Le regole hanno logica (creazione legata al segno di
import, anno con listino, campi ammessi): i loro test sull'emulatore sono obbligatori prima del rilascio.

## Project Structure

### Documentation (this feature)

```text
specs/004-import-excel-acr/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── import-api.md            # funzioni pure di @tesseramento/import
│   ├── firestore-import.md      # forma dei documenti e matrice di accesso delle regole
│   └── app-routes.md            # rotta, stati della schermata, messaggi
└── tasks.md                     # creato da /speckit-tasks
```

### Source Code (repository root)

```text
packages/import/                    # NUOVO, nessuna dipendenza di runtime
├── src/
│   ├── columns.ts                  # colonne necessarie, ricerca per nome
│   ├── clean.ts                    # pulizia testi, valori vuoti, data Excel → AAAA-MM-GG
│   ├── identity.ts                 # chiave cognome|nome|data normalizzata
│   ├── parse-sheet.ts              # righe del foglio → ParsedImport (anno, righe valide, saltate, errori)
│   ├── plan-import.ts              # ParsedImport + persone esistenti → persone nuove/riusate, adesioni
│   └── index.ts
└── tests/                          # sintetici + i tre file finti letti con SheetJS (devDependency)

firebase/
├── firestore.rules                 # + importBatches, persons, adhesions
└── tests/rules.test.ts             # + sezioni I1…I10

apps/web/src/app/
├── importa/
│   ├── workbook-reader.ts          # import dinamico di SheetJS: ArrayBuffer → fogli e righe
│   ├── import-backend.ts           # interfaccia + token (finto nei test)
│   ├── firestore-import-backend.ts # persone esistenti, stato anno, transazione di salvataggio
│   ├── import.service.ts           # stati con signals: scelta → anteprima/rifiuto → salvataggio → esito
│   ├── testing.ts                  # backend finto
│   ├── pages/import/               # scelta file, anteprima, riepilogo
│   └── firestore-import-backend.emulator.test.ts
├── tesserati/                      # FR-019: elenco in sola lettura dei tesserati di un anno
│   ├── members-backend.ts          # interfaccia + token; Firestore: anni importati, adesioni ⨝ persone
│   ├── firestore-members-backend.ts
│   └── pages/members/              # scelta anno + tabella
├── listini/schedule-usage.ts       # ora reale: esiste un import per l'anno?
├── pages/home/home.ts              # + link "Importa Excel" e "Tesserati"
└── app.routes.ts                   # + /importa (canDeactivate durante il salvataggio), /tesserati
```

**Structure Decision**: la trasformazione delle righe è pura e in un pacchetto a parte come `fees`, così si
testa senza browser né Firebase e la 005 (Giovani/Adulti) la riusa; SheetJS sta solo nell'app (lettura del
file) e come devDependency del pacchetto per i test sui file finti. L'accesso ai dati è dietro
un'interfaccia `ImportBackend`, come per accesso e listini.

## Complexity Tracking

| Rischio | Perché è tracciato | Mitigazione |
|---|---|---|
| SheetJS non è su npm aggiornato | Il pacchetto `xlsx` di npm è fermo a 0.18.5 con vulnerabilità note | Installare il tarball ufficiale 0.20.3 dal CDN SheetJS, versione fissata nel `package-lock` |
| Limite di chiamate `exists/get` nelle regole per richiesta | Una transazione da ~180 scritture valuta le regole per ogni documento | Regole che leggono solo documenti condivisi (email autorizzata, segno di import, listino): test sull'emulatore con un import completo |
| Persone duplicate se due anni diversi si importano nello stesso istante | Le persone esistenti si leggono fuori dalla transazione | Caso irrealistico (un import l'anno); i duplicati sono compito della 006 |
