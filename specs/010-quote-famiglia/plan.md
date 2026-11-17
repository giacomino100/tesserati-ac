# Implementation Plan: Quote nella famiglia

**Branch**: `010-quote-famiglia` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-quote-famiglia/spec.md`

## Summary

Nuova pagina **Quote** (`/quote?anno=`). Nel pacchetto puro `@tesseramento/families` (che ora dipende da
`@tesseramento/fees`, anch'esso puro) si aggiungono: i **nuclei dell'anno** (famiglie confermate con i componenti
effettivi + ogni tesserato senza famiglia), il loro **calcolo** con `calculateHouseholdFee` e il listino dell'anno, e
il **confronto** con le quote salvate (uguale / da ricalcolare / nuovo / non più presente; validità delle quote
manuali). In Firestore ogni quota salvata è `householdFees/{anno}_{chiaveNucleo}` con componenti, righe del calcolo o
quota manuale con nota, totale, chi e quando; le regole controllano forma, importi interi ≥ 0, nota obbligatoria per
le manuali e chi/quando. Nessun importo nel codice dell'app: solo listino + calcolo della 002.

## Technical Context

**Language/Version**: TypeScript `~6.0` in modalità `strict`; Node.js 24.x (≥ 22.22.3)

**Primary Dependencies**: nessuna nuova; `@tesseramento/fees` (calcolo 002, `parseEuros`/`formatEuros`),
`@tesseramento/families` (007, esteso), Angular 22.2, Material, Firebase 13.4

**Storage**: Cloud Firestore, nuova collezione `householdFees`; lette `feeSchedules`, `families`, `familyMemberships`,
`adhesions`, `persons`

**Testing**: Vitest (pacchetti e app), emulatori per regole e integrazione

**Target Platform**: browser moderni su PC e telefono (360 px), Firebase Hosting

**Project Type**: web application (`packages/families`, `apps/web`, `firebase/`)

**Performance Goals**: pagina dell'anno in meno di 3 s con ~165 tesserati (~120 nuclei); "Aggiorna tutte" in una
sola transazione (≤ 120 scritture < 500; le regole di `householdFees` non leggono altri documenti oltre l'email
autorizzata, quindi nessun limite di letture)

**Constraints**: importi in centesimi interi, mai percentuali né arrotondamenti nel codice dell'app; solo dati finti
nei test; nessun nome nei log; persone, adesioni, famiglie e listino non vengono modificati da questa pagina

**Scale/Scope**: ~120 nuclei per anno, 1 schermata nuova

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Valutazione | Note |
|---|---|---|
| I. Dominio fonte di verità | ✅ | Solo regole del PDF (calcolo 002); casi non previsti segnalati e decisi a mano con nota (`regole-quote.md` §4, aggiornato); fasce dall'età, mai dall'export |
| II. Calcolo quote puro e testato (NON-NEGOTIABLE) | ✅ | Il calcolo resta `calculateHouseholdFee`; nuclei, confronto e validità sono funzioni pure testate prima; test che i 29 esempi danno gli stessi totali passando da famiglie e listino come in archivio (SC-001) |
| III. Riservatezza (NON-NEGOTIABLE) | ✅ | Regole "nega tutto" estese e testate; le quote salvate contengono ID, importi, nota, chi/quando — nessun dato anagrafico copiato |
| IV. Storico per anno | ✅ | Le quote salvate non cambiano da sole quando cambiano listino, famiglie o tesserati: si aggiornano solo su richiesta (FR-008) |
| V. Semplicità | ✅ | Nessuna libreria, nessuna Function; si estende il pacchetto delle famiglie invece di crearne un altro |

**Esito**: nessuna violazione. **Ri-verifica dopo la fase 1**: invariata.

## Project Structure

### Documentation (this feature)

```text
specs/010-quote-famiglia/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── households-api.md        # nuove funzioni pure di @tesseramento/families
│   ├── firestore-fees.md        # householdFees e regole
│   └── app-routes.md            # /quote, stati, testi
└── tasks.md
```

### Source Code (repository root)

```text
packages/families/src/
├── households.ts        # NUOVO: nuclei dell'anno (famiglie confermate + singoli)
├── household-fees.ts    # NUOVO: calcolo dei nuclei con @tesseramento/fees, confronto con le quote salvate
└── index.ts             # + esportazioni; package.json: dipendenza @tesseramento/fees

packages/families/tests/ # + nuclei, calcolo sui file finti (565,00 €), 29 esempi via nuclei, confronto

firebase/
├── firestore.rules      # + householdFees
└── tests/rules.test.ts  # + sezione K

apps/web/src/app/quote/
├── fees-backend.ts             # interfaccia + token
├── firestore-fees-backend.ts   # quote salvate, salvataggio in transazione
├── fees.service.ts             # stato (signals): nuclei, calcolo, confronto, quote manuali
├── testing.ts
├── pages/fees/                 # /quote
└── firestore-fees-backend.emulator.test.ts
```

Riusa `FAMILIES_BACKEND` (007) per tesserati, famiglie e appartenenze e `FEE_SCHEDULE_BACKEND` (003) per il listino.

**Structure Decision**: la composizione nuclei + calcolo è pura e sta vicino alle famiglie; l'app la mostra e salva.

## Complexity Tracking

Nessuna deviazione da giustificare.
