# Implementation Plan: Cambio categoria per età

**Branch**: `011-cambio-categoria` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-cambio-categoria/spec.md`

## Summary

La pagina **Tesserati** mostra l'elenco di ogni adesione, l'avviso "Per età: …" per quelle non allineate (con il
listino dell'anno), "Allinea all'età", "Allinea tutte", "Cambia elenco" con nota e "Togli eccezione". Nel pacchetto puro
`@tesseramento/families` si aggiunge l'**elenco per età** (`listForAge`, riusato anche dalla vista delle riconferme) e lo
**stato** di ogni adesione (allineata / non allineata / eccezione) con il piano di "Allinea tutte". In Firestore
l'adesione ottiene `list` (elenco attuale, ha la precedenza su quello del segno di import), `sector` coerente,
`exportSector` (settore dell'export, copiato al primo cambio di un'adesione importata) e `listChange { from, at, by,
note? }`; le regole permettono di aggiornare **solo** questi campi, senza altre letture. Riconferme mostra "L'anno scorso
era un'eccezione: …". Le quote non usano l'elenco e non cambiano.

## Technical Context

**Language/Version**: TypeScript `~6.0` in modalità `strict`; Node.js 24.x (≥ 22.22.3)

**Primary Dependencies**: nessuna nuova; `@tesseramento/families` (esteso), `@tesseramento/fees` (`ageFor`,
`bandForAge`), `@tesseramento/import` (`listOfAdhesion`, `sectorOf`, `listLabel`), Angular 22.2, Material, Firebase 13.4

**Storage**: Cloud Firestore, `adhesions` (nuovi campi aggiornabili); letto `feeSchedules`

**Testing**: Vitest (pacchetti e app), emulatori per regole e integrazione

**Target Platform**: browser moderni su PC e telefono (360 px), Firebase Hosting

**Project Type**: web application (`packages/families`, `packages/import`, `apps/web`, `firebase/`)

**Performance Goals**: Tesserati come oggi (< 3 s, ~165 adesioni); "Allinea tutte" in una sola transazione (le regole
dell'aggiornamento non leggono altri documenti oltre l'email autorizzata; ≤ 500 scritture)

**Constraints**: nessun altro campo dell'adesione cambia; persone, famiglie e quote intatte; nota ≤ 200 caratteri;
solo dati finti nei test; nessun nome nei log

**Scale/Scope**: 1 pagina ritoccata (Tesserati), avviso in Riconferme, regole di `adhesions`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Valutazione | Note |
|---|---|---|
| I. Dominio fonte di verità | ✅ | `regole-famiglia.md` §3 e `regole-quote.md` aggiornati prima della specifica; elenco per età dalle fasce del PDF |
| II. Calcolo quote puro e testato | ✅ | Le quote non cambiano (dipendono solo dall'età); elenco per età e stati sono funzioni pure testate prima |
| III. Riservatezza (NON-NEGOTIABLE) | ✅ | Regole estese e testate: solo i campi del cambio, data ed email di chi salva |
| IV. Storico per anno | ✅ | Si cambia solo l'adesione dell'anno scelto; l'elenco di prima e il settore dell'export restano |
| V. Semplicità | ✅ | Nessuna collezione nuova; un solo campo di "ultimo cambio" (niente storico completo) |

**Esito**: nessuna violazione. **Ri-verifica dopo la fase 1**: invariata.

## Project Structure

### Documentation (this feature)

```text
specs/011-cambio-categoria/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── categories-api.md        # funzioni pure (families, import)
│   ├── firestore-list-change.md # aggiornamento di adhesions, regole
│   └── app-routes.md            # Tesserati, Riconferme, testi
└── tasks.md
```

### Source Code (repository root)

```text
packages/families/src/
├── categories.ts        # NUOVO: listForAge, listStatus, alignAllPlan
├── renewals.ts          # usa listForAge; avviso previousException
└── types.ts             # + ListStatus, YearMember.exception?

packages/import/src/lists.ts   # listOfAdhesion: `list` ha la precedenza su `importId`

firebase/
├── firestore.rules      # adhesions: + update dei soli campi del cambio
└── tests/rules.test.ts  # + sezione N

apps/web/src/app/
├── tesserati/
│   ├── members-backend.ts            # MemberRow + adhesionId, list, listChange; changeList(); schedule()
│   ├── firestore-members-backend.ts
│   ├── members.service.ts            # NUOVO: stato, allineamento, eccezioni (signals)
│   ├── testing.ts                    # NUOVO: finto condiviso
│   └── pages/members/                # colonna Elenco, avvisi, azioni, dialoghi
├── famiglie/firestore-families-backend.ts   # exception dal listChange
└── riconferme/renewals.service.ts           # testo dell'avviso
```

**Structure Decision**: l'elenco per età è logica di dominio pura accanto alla riconferma (stesse fasce); Tesserati passa
da pagina in sola lettura a pagina con un servizio.

## Complexity Tracking

Nessuna deviazione da giustificare.
