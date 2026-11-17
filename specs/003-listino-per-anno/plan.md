# Implementation Plan: Listino per anno

**Branch**: `003-listino-per-anno` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-listino-per-anno/spec.md`

## Summary

I listini passano dal codice ai dati: una collezione Firestore `feeSchedules` (un documento per anno,
ID = anno) con la stessa forma di `FeeSchedule` della specifica 002 più data ed email dell'ultima
modifica. L'app ottiene tre schermate (elenco, nuovo listino, dettaglio/modifica). Le **regole di
Firestore sono la barriera vera**: validano forma e valori, consentono di creare solo l'anno
successivo al più recente (copiando le regole fisse del PDF), di modificare solo le quote e mai di
cancellare. Parsing e validazione degli importi stanno in funzioni pure nel pacchetto
`@tesseramento/fees` (principio II); la collisione tra due persone si gestisce con un controllo di
`updatedAt` in transazione. Il listino 2026/27 si inserisce all'avvio con uno script di
inizializzazione i cui valori sono verificati da un test contro `SCHEDULE_2026_27`.

## Technical Context

**Language/Version**: TypeScript `~6.0` in modalità `strict`; Node.js 24.x (≥ 22.22.3)

**Primary Dependencies**: nessuna nuova: `@angular/*` 22.2, `@angular/material`, `firebase` 13.4 (già presenti); `@tesseramento/fees` (workspace) per validazione e importi

**Storage**: Cloud Firestore, collezione `feeSchedules` (ID documento = anno di inizio, es. `2026`)

**Testing**: Vitest (fees e app); Firebase Emulator Suite + `@firebase/rules-unit-testing` per le regole (**richiede un JDK, non ancora installato**)

**Target Platform**: browser moderni su PC e telefono (360 px), Firebase Hosting

**Project Type**: web application (estende `apps/web`, `packages/fees`, `firebase/`)

**Performance Goals**: creazione di un listino in meno di 3 minuti (SC-001); elenco e dettaglio istantanei per 1–10 anni

**Constraints**: nessun piano Blaze né Cloud Functions; importi in centesimi interi; nessuna quota o percentuale nel codice di calcolo; interfaccia in italiano; solo dati finti nei test

**Scale/Scope**: 2–5 utenti, un listino all'anno (pochi documenti), 3 schermate

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Valutazione | Note |
|---|---|---|
| I. Dominio fonte di verità | ✅ | Quote e regole dal PDF; fasce d'età, età minima e massimo del nucleo non modificabili (copiati dall'anno precedente). Nessun sconto calcolato: la quota con sconto è un valore inserito, come nel PDF |
| II. Calcolo quote puro e testato | ✅ | Parsing/validazione degli importi in `packages/fees` (puro, senza Firebase); test di andata e ritorno: il listino serializzato come in archivio dà gli stessi totali dei 29 esempi (SC-005) |
| III. Riservatezza (NON-NEGOTIABLE) | ⚠️ ✅ | Regole "nega tutto" con eccezioni minime, testate sull'emulatore. **Prerequisito aperto**: serve il JDK per eseguirli; senza, la constitution vieta di pubblicare le regole (vedi Complexity Tracking) |
| IV. Storico per anno | ✅ | Un documento per anno; creare o modificare un anno non tocca gli altri; nessuna cancellazione; le quote già calcolate non si ricalcolano da sole |
| V. Semplicità | ✅ | Nessuna libreria nuova, nessuna Function; un solo indice (nessuno) e una sola collezione |

**Esito**: nessuna violazione di principio; un rischio operativo sul principio III (JDK) è tracciato sotto.

**Ri-verifica dopo la fase 1 (design)**: invariata. Le regole di questa specifica contengono logica
(validazione, "solo l'anno successivo", campi immutabili): per questo i loro test sono obbligatori
prima del rilascio, a differenza della 001 dove le regole erano banali.

## Project Structure

### Documentation (this feature)

```text
specs/003-listino-per-anno/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── firestore-fee-schedules.md   # forma del documento e matrice di accesso delle regole
│   ├── fees-api-additions.md        # nuove funzioni pure di @tesseramento/fees
│   └── app-routes.md                # rotte, schermate, messaggi
└── tasks.md                         # creato da /speckit-tasks
```

### Source Code (repository root)

```text
packages/fees/                      # estesa, sempre senza dipendenze
├── src/
│   ├── money.ts                    # parseEuros, formatEuros
│   ├── schedule-draft.ts           # bozza in euro ↔ FeeSchedule, validateFeeSchedule, labelFor, nextAssociationYear
│   └── index.ts                    # + nuove esportazioni (contract additivo)
└── tests/
    ├── money.test.ts
    ├── schedule-draft.test.ts
    └── schedule-roundtrip.test.ts  # SC-005: listino serializzato → 29 esempi

firebase/
├── firestore.rules                 # + match /feeSchedules/{yearId}
├── seed/fee-schedule-2026.json     # valori del listino 2026/27 (forma del documento)
├── scripts/seed-fee-schedule.cjs   # inizializzazione con le credenziali della CLI Firebase
└── tests/
    ├── rules.test.ts               # esteso: sezione feeSchedules (guardie F1…F10)
    └── seed.test.ts                # il JSON di seed coincide con SCHEDULE_2026_27

apps/web/src/app/
├── core/…                          # invariato (auth)
├── listini/
│   ├── fee-schedule-backend.ts          # interfaccia + token (backend finto nei test)
│   ├── firestore-fee-schedule-backend.ts# implementazione Firestore, transazione con controllo updatedAt
│   ├── fee-schedule.service.ts          # elenco, apertura, creazione, modifica, conflitti (signals)
│   ├── schedule-usage.ts                # isInUse(anno): per ora sempre false (arriva con la 004)
│   ├── schedule-mapper.ts               # documento ↔ FeeSchedule + ultima modifica
│   ├── schedule-form/                   # modulo con le quote in euro e gli errori per campo
│   └── pages/ (elenco, dettaglio, nuovo)
└── app.routes.ts                   # + /listini, /listini/nuovo, /listini/:anno
```

**Structure Decision**: la logica pura (importi, validazione, anno successivo) in `packages/fees`,
così resta testabile senza Firebase e riusabile dal calcolo; l'accesso ai dati dietro
un'interfaccia `FeeScheduleBackend` come per l'accesso; le regole e il loro seed nel workspace
`firebase/`. Il test `seed.test.ts` è l'unico punto in cui `firebase/` dipende da `fees` (solo
devDependency).

## Complexity Tracking

| Rischio | Perché è tracciato | Mitigazione |
|---|---|---|
| Regole con logica e JDK assente | Principio III: regole testate sull'emulatore prima del rilascio; sul PC manca il JDK | Installare un JDK 21 **prima** di `/speckit-implement`; il rilascio delle regole resta l'ultimo passo e solo a test verdi |
