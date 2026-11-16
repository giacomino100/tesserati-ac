# Implementation Plan: Calcolo quota famiglia

**Branch**: `002-calcolo-quote-famiglia` | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-calcolo-quote-famiglia/spec.md`

## Summary

Calcolare, per un nucleo di tesserati di un anno associativo, fascia, agevolazione e importo di
ogni componente, l'eventuale riga "pacchetto 2 ACR" e il totale, applicando alla lettera le
regole del PDF quote 2026/27; segnalare come "non previsto" i nuclei oltre 4 persone o con
bambini sotto i 6 anni.

Approccio: pacchetto TypeScript puro `@tesseramento/fees` in un workspace npm, con il listino
come parametro, importi in centesimi, una regola esplicita per ogni dimensione di nucleo, e i 29
esempi di `docs/dominio/regole-quote.md` come test Vitest scritti prima del codice
([research.md](./research.md)).

## Technical Context

**Language/Version**: TypeScript 6.0.x (`strict`) su Node.js 22 LTS — versione allineata ad Angular 22 (R2)

**Primary Dependencies**: nessuna a runtime; in sviluppo solo `typescript` e `vitest`

**Storage**: N/A (calcolo in memoria; listini e adesioni saranno salvati dalle specifiche 003–009)

**Testing**: Vitest 5.x — test guidati dai dati per i 29 esempi, test di allineamento con `regole-quote.md`, test dei casi limite

**Target Platform**: qualunque runtime JavaScript (browser per l'app Angular, Node per i test)

**Project Type**: libreria (pacchetto di un workspace che ospiterà anche l'app web)

**Performance Goals**: non critiche — circa 160 tesserati/anno; un nucleo si calcola in tempo trascurabile (< 1 ms)

**Constraints**: funzioni pure; importi in centesimi interi; nessun valore di quota nel codice delle regole; nessun dato personale reale nei test

**Scale/Scope**: nuclei da 0 a 4 componenti calcolati; oltre → "non previsto"

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio / vincolo | Verifica sul piano | Esito |
|---|---|---|
| I. Dominio fonte di verità | Regole = FR-004…FR-010 alla lettera (R5); casi fuori PDF → `notCovered`; test di allineamento con `regole-quote.md` (R8) | ✅ |
| II. Calcolo puro e testato | Pacchetto separato senza dipendenze (R1); funzioni pure (contratto G1, G5); test scritti prima; centesimi (R3); quote lette dal listino (R6, G2) | ✅ |
| III. Riservatezza | Nessun salvataggio; fixture solo con dati finti degli Excel di esempio (R9) | ✅ |
| IV. Storico per anno | Listino passato come parametro e legato all'anno; controllo `scheduleYearMismatch` | ✅ |
| V. Semplicità | Zero dipendenze runtime; nessun servizio esterno; dimostrabile con `npm test` | ✅ |
| Vincoli tecnologici | TypeScript strict ✅; Vitest ✅; Angular/Firebase non ancora necessari (arrivano con 001/004) | ✅ |
| Lingua | Identificatori in inglese, valori di dominio e documentazione in italiano | ✅ |

**Re-check dopo la Fase 1** (data-model, contratto, quickstart): nessuna violazione; nessuna voce
in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-calcolo-quote-famiglia/
├── spec.md
├── plan.md              # questo file
├── research.md          # Fase 0: decisioni R1–R9
├── data-model.md        # Fase 1: tipi, listino 2026/27, tabella delle regole
├── quickstart.md        # Fase 1: come verificare
├── contracts/
│   └── fees-api.md      # Fase 1: API pubblica del pacchetto
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
package.json                  # workspace npm: "packages/*" (e "apps/*" dalle prossime specifiche)
tsconfig.base.json            # opzioni comuni, strict
packages/
└── fees/                     # @tesseramento/fees
    ├── package.json
    ├── tsconfig.json
    ├── vitest.config.ts
    ├── src/
    │   ├── index.ts              # esportazioni pubbliche (solo quelle del contratto)
    │   ├── types.ts              # tipi di data-model.md
    │   ├── schedules/
    │   │   └── 2026-27.ts        # SCHEDULE_2026_27 dal PDF
    │   ├── age-band.ts           # età e fascia (FR-001)
    │   ├── validate.ts           # controlli di input → invalidInput (età massima 110)
    │   ├── order.ts              # ordinamento stabile (FR-003)
    │   └── household-fee.ts      # regole FR-004…FR-012
    └── tests/
        ├── fixtures/
        │   ├── examples.ts           # 29 casi di regole-quote.md §3
        │   └── sample-households.ts  # nuclei degli Excel finti
        ├── examples.test.ts          # SC-001
        ├── examples-sync.test.ts     # fixture ↔ regole-quote.md
        ├── age-band.test.ts          # confini di fascia
        ├── order.test.ts             # ordine stabile (FR-003)
        ├── validate.test.ts          # input non valido, età massima 110
        ├── us1-details.test.ts       # scenari di accettazione US1
        ├── us2-details.test.ts       # scenari di accettazione US2
        ├── not-covered.test.ts       # SC-002, US3
        ├── edge-cases.test.ts        # nucleo vuoto, gemelli, ordine, input non valido
        └── sample-households.test.ts # SC-003
apps/                         # (futuro) web/ — app Angular, specifiche 001 e 004
```

**Structure Decision**: workspace npm con il pacchetto `packages/fees`; l'app Angular sarà
aggiunta in `apps/web` dalle specifiche successive e importerà `@tesseramento/fees`.

## Complexity Tracking

Nessuna violazione della constitution da giustificare.
