# Implementation Plan: Famiglie

**Branch**: `007-famiglie` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-famiglie/spec.md`

## Summary

Nuova sezione **Famiglie** (`/famiglie?anno=`). Un nuovo pacchetto puro `@tesseramento/families` calcola dalle
adesioni dell'anno le famiglie suggerite (stesso `N. Legame`), gli avvisi sul `Legame`, le aggiunte proposte alle
famiglie confermate e i tesserati senza famiglia, e valida le modifiche (almeno 2 componenti, una famiglia per
persona). In Firestore ogni famiglia confermata è un documento `families/{id}` (anno, componenti, origine,
`N. Legame`, ultima conferma) e ogni componente ha un **indice di appartenenza** `familyMemberships/{anno}_{personId}`
che, con le regole, garantisce che una persona stia in al massimo una famiglia per anno. Conferma, correzione e
scioglimento sono transazioni; persone e adesioni non vengono mai toccate.

## Technical Context

**Language/Version**: TypeScript `~6.0` in modalità `strict`; Node.js 24.x (≥ 22.22.3)

**Primary Dependencies**: nessuna nuova (Angular 22.2, Material, Firebase 13.4); nuovo pacchetto interno puro
`@tesseramento/families` (devDependencies di test: `@tesseramento/import` e SheetJS per i file finti)

**Storage**: Cloud Firestore, nuove collezioni `families` e `familyMemberships`; lette `persons`, `adhesions`,
`importBatches`

**Testing**: Vitest (pacchetto e app), emulatori per regole (`npm run test:rules`) e integrazione

**Target Platform**: browser moderni su PC e telefono (360 px), Firebase Hosting

**Project Type**: web application (nuovo `packages/families`, `apps/web`, `firebase/`)

**Performance Goals**: pagina dell'anno in meno di 2 s con ~165 adesioni; "Conferma tutte" (≈ 45 famiglie reali)
a gruppi di 8 famiglie per transazione (limite di 20 documenti letti dalle regole per richiesta)

**Constraints**: nessuna Cloud Function; solo dati finti nei test; nessun nome nei log; persone e adesioni immutabili

**Scale/Scope**: ~45 famiglie per anno, 2–5 utenti, 1 schermata nuova

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Valutazione | Note |
|---|---|---|
| I. Dominio fonte di verità | ✅ | Famiglia, una per persona per anno e "almeno 2" da `regole-famiglia.md` §0–§1 (aggiornato prima della spec) e dai chiarimenti; il `Legame` si usa solo per gli avvisi |
| II. Calcolo quote puro e testato | ✅ n/a | Nessun calcolo di quote; il raggruppamento è comunque puro e testato prima (riusabile dalla 010) |
| III. Riservatezza (NON-NEGOTIABLE) | ✅ | Regole "nega tutto" estese con test sull'emulatore; le famiglie contengono solo ID di persone, anno, origine, `N. Legame`, chi e quando; nessun dato anagrafico duplicato |
| IV. Storico per anno | ✅ | Famiglie e appartenenze per anno; nessuna modifica a persone e adesioni; un anno non tocca gli altri |
| V. Semplicità | ✅ | Nessuna libreria; un pacchetto puro piccolo giustificato dal riuso nella 010; un indice di appartenenza al posto di una Cloud Function |

**Esito**: nessuna violazione. **Ri-verifica dopo la fase 1**: invariata.

## Project Structure

### Documentation (this feature)

```text
specs/007-famiglie/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── families-api.md          # funzioni pure di @tesseramento/families
│   ├── firestore-families.md    # documenti e matrice di accesso delle regole
│   └── app-routes.md            # /famiglie, stati, testi
└── tasks.md
```

### Source Code (repository root)

```text
packages/families/                  # NUOVO, nessuna dipendenza di runtime
├── src/
│   ├── types.ts                    # YearMember, ConfirmedFamily, SuggestedFamily, FamilyWarning…
│   ├── bond.ts                     # "C3" → { kind: 'C', size: 3 }
│   ├── suggest.ts                  # famiglie suggerite, aggiunte proposte, senza famiglia, avvisi
│   ├── validate.ts                 # almeno 2 componenti, una famiglia per persona
│   └── index.ts
└── tests/                          # sintetici + i tre file finti (via @tesseramento/import, devDependency)

firebase/
├── firestore.rules                 # + families, familyMemberships
└── tests/rules.test.ts             # + sezione J1–J10

apps/web/src/app/famiglie/
├── families-backend.ts             # interfaccia + token
├── firestore-families-backend.ts   # tesserati dell'anno, famiglie confermate, conferma/correzione/scioglimento
├── families.service.ts             # stato con signals, modifiche in bozza
├── testing.ts                      # backend finto
├── pages/families/                 # scelta anno, famiglie suggerite/confermate, senza famiglia
└── firestore-families-backend.emulator.test.ts
```

**Structure Decision**: la logica di raggruppamento e validazione è pura in `packages/families` (la userà la 010 per
le quote); accesso ai dati dietro un'interfaccia come nelle specifiche precedenti.

## Complexity Tracking

| Scelta | Perché serve | Alternativa scartata |
|---|---|---|
| Indice `familyMemberships/{anno}_{personId}` (fonte di verità, research R8) | Le regole non possono cercare in tutte le famiglie; l'ID dell'indice rende impossibile due **appartenenze** nello stesso anno, e in lettura conta solo l'appartenenza (i `memberIds` incoerenti sono ignorati e segnalati) | Controllo solo nell'app (non garantito con due utenti insieme); un documento unico per anno (le regole non possono controllare "almeno 2" per ogni famiglia di una mappa) |
