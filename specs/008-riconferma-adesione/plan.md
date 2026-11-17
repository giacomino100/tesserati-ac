# Implementation Plan: Riconferma adesione

**Branch**: `008-riconferma-adesione` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-riconferma-adesione/spec.md`

## Summary

Nuova pagina **Riconferme** (`/riconferme?anno=`). Nel pacchetto puro `@tesseramento/families` si aggiunge la **vista
delle riconferme**: dai tesserati dell'anno precedente e da quelli dell'anno nuovo ricava i gruppi per `N. Legame`, i
singoli, l'età e l'elenco del nuovo anno (fasce del listino → ACR / Giovani / Adulti), i cambi di elenco, gli avvisi e
chi è già iscritto (con la possibilità di annullare). In Firestore una riconferma è un'**adesione** come le altre
(`adhesions/{anno}_{personId}`) con `origin: 'riconferma'`, `list`, `sector`, `bond`/`bondId` copiati, `renewedFrom`,
`renewedAt`, `renewedBy`; le regole la accettano solo se esiste l'adesione dell'anno precedente e il listino dell'anno
nuovo, e la lasciano cancellare solo se la persona non ha un'appartenenza a una famiglia dell'anno. Le pagine esistenti
leggono l'elenco con un'unica funzione (`importId` **o** `list`) e gli anni con tesserati includono quelli fatti solo di
riconferme; l'import salta le persone già riconfermate.

## Technical Context

**Language/Version**: TypeScript `~6.0` in modalità `strict`; Node.js 24.x (≥ 22.22.3)

**Primary Dependencies**: nessuna nuova; `@tesseramento/families` (esteso), `@tesseramento/fees` (`ageFor`,
`bandForAge`), `@tesseramento/import` (elenchi, `planImport` esteso), Angular 22.2, Material, Firebase 13.4

**Storage**: Cloud Firestore, collezione `adhesions` estesa (nuova forma "riconferma"); lette `persons`,
`feeSchedules`, `familyMemberships`, `householdFees`, `importBatches`

**Testing**: Vitest (pacchetti e app), emulatori per regole e integrazione

**Target Platform**: browser moderni su PC e telefono (360 px), Firebase Hosting

**Project Type**: web application (`packages/families`, `packages/import`, `apps/web`, `firebase/`)

**Performance Goals**: pagina in meno di 3 s con ~165 tesserati dell'anno precedente; riconferma di tutti in meno di
10 s. Le regole leggono 2 documenti per riconferma (adesione dell'anno precedente + listino, quest'ultimo uguale per
tutte): con il limite di 20 letture per scrittura multipla l'app salva **a gruppi di 15** (research R5).

**Constraints**: una sola adesione per persona per anno; nessuna persona creata o modificata; adesioni di altri anni
mai toccate; solo dati finti nei test; nessun nome nei log

**Scale/Scope**: ~165 persone per anno, 1 schermata nuova, ritocchi a Tesserati / Famiglie / Quote / Import / Listini

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Valutazione | Note |
|---|---|---|
| I. Dominio fonte di verità | ✅ | Glossario e `regole-famiglia.md` §3 aggiornati prima della specifica; elenco del nuovo anno solo dalle fasce del listino (PDF), mai dall'export; sotto l'età minima "non previsto" |
| II. Calcolo quote puro e testato (NON-NEGOTIABLE) | ✅ | Nessun calcolo di quote; età e fascia con `ageFor`/`bandForAge` di `@tesseramento/fees`; la vista è una funzione pura testata prima |
| III. Riservatezza (NON-NEGOTIABLE) | ✅ | Regole "nega tutto" estese e testate (sezione L); la riconferma copia solo ID, elenco e legame, nessun dato anagrafico in più |
| IV. Storico per anno | ✅ | La riconferma crea solo adesioni dell'anno nuovo; adesioni e quote degli anni precedenti non cambiano; le quote salvate dell'anno nuovo non cambiano da sole (010) |
| V. Semplicità | ✅ | Nessuna collezione nuova: la riconferma è un'adesione; nessuna libreria, nessuna Function |

**Esito**: nessuna violazione. **Ri-verifica dopo la fase 1**: invariata.

## Project Structure

### Documentation (this feature)

```text
specs/008-riconferma-adesione/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── renewals-api.md          # funzioni pure (families, import)
│   ├── firestore-renewals.md    # adesione "riconferma", regole, letture
│   └── app-routes.md            # /riconferme, stati, testi
└── tasks.md
```

### Source Code (repository root)

```text
packages/families/src/
├── renewals.ts          # NUOVO: vista delle riconferme, elenco dalla fascia
├── types.ts             # + YearMember.origin, tipi della vista
└── index.ts

packages/import/src/
├── lists.ts             # + listOfAdhesion(importId, list)
├── plan-import.ts       # + persone riconfermate → riga saltata 'alreadyRenewed'
└── types.ts             # + SkipReason 'alreadyRenewed'

firebase/
├── firestore.rules      # adhesions: + creazione "riconferma", + cancellazione
└── tests/rules.test.ts  # + sezione L

apps/web/src/app/
├── core/member-years.ts           # NUOVO: anni con tesserati (import + riconferme)
├── riconferme/
│   ├── renewals-backend.ts         # interfaccia + token + errori
│   ├── firestore-renewals-backend.ts
│   ├── renewals.service.ts         # stato (signals), selezione, riconferma, annullamento
│   ├── testing.ts
│   ├── pages/renewals/             # /riconferme
│   └── firestore-renewals-backend.emulator.test.ts
├── famiglie/firestore-families-backend.ts   # elenco con listOfAdhesion, origin, anni
├── tesserati/firestore-members-backend.ts   # anni con tesserati
├── importa/…                                 # elenco con listOfAdhesion, persone riconfermate, messaggio
├── listini/schedule-usage.ts                 # anno in uso anche con sole riconferme
└── app.routes.ts, app.config.ts, pages/home  # rotta, provider, voce "Riconferme"
```

**Structure Decision**: la vista è logica pura sui tesserati e sta nel pacchetto delle famiglie (stessi `YearMember`,
stessi gruppi per `N. Legame`); l'app legge, mostra e scrive.

## Complexity Tracking

| Scelta | Perché | Alternativa scartata |
|---|---|---|
| Salvataggio a gruppi di 15 (tutto o niente per gruppo) | Le regole verificano l'adesione dell'anno precedente: 1 lettura per persona, limite 20 per scrittura | Nessun controllo nelle regole (FR-011 lo chiede); Cloud Function (principio V) |
