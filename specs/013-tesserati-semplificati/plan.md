# Implementation Plan: Tesserati semplificati

**Branch**: `013-tesserati-semplificati` | **Date**: 2026-11-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-tesserati-semplificati/spec.md`

## Summary

La pagina **Tesserati** diventa l'unico posto del lavoro quotidiano: per l'anno scelto un elenco con "Da confermare"
(tesserati dell'anno prima) e "Iscritti", filtro, ricerca, una **data di pagamento** comune (oggi, modificabile) usata
da "Conferma" e da "Nuovo tesserato", il **pannello Famiglia** e le azioni secondarie (Annulla conferma, Registra
pagamento, Cambia elenco). La logica pura è in `@tesseramento/families`: `memberYearView` (righe e stati) e
`familyAfterConfirm` (aggiornamento automatico della famiglia, chiarimento B). In Firestore l'adesione riceve
`paidOn` ("AAAA-MM-GG", non futura), `paidAt`, `paidBy` e, per chi è tolto a mano da una famiglia, `familyOptOut`;
l'email autorizzata riceve `admin: true` (dalla console) e le regole riservano l'import all'amministratore. La pagina
**Riconferme** e i suoi servizi spariscono (la rotta rimanda a Tesserati); restano i backend delle riconferme (008) e del
nuovo tesserato (009), riusati dalla nuova pagina.

## Technical Context

**Language/Version**: TypeScript `~6.0` in modalità `strict`; Node.js 24.x (≥ 22.22.3)

**Primary Dependencies**: nessuna nuova; `@tesseramento/families`, `@tesseramento/fees`, `@tesseramento/import`,
Angular 22.2, Material, Firebase 13.4

**Storage**: Cloud Firestore: `adhesions` (+ pagamento, + `familyOptOut`), `allowedEmails` (+ `admin`, solo console),
`families` / `familyMemberships` (scritte come nella 007)

**Testing**: Vitest (pacchetti e app), emulatori per regole e integrazione

**Target Platform**: browser moderni su PC e telefono (360 px), Firebase Hosting

**Project Type**: web application (`packages/families`, `apps/web`, `firebase/`)

**Performance Goals**: elenco di un anno con ~165 persone in meno di 3 s; conferma di una persona in una transazione
(adesione) più una (famiglia, se serve)

**Constraints**: una adesione per persona per anno; una famiglia per persona per anno; nessuna email nel codice;
solo dati finti nei test; nessun nome nei log

**Scale/Scope**: 1 pagina rifatta (Tesserati), 1 pannello, 1 pagina tolta (Riconferme), guardia dell'import

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Valutazione | Note |
|---|---|---|
| I. Dominio fonte di verità | ✅ | Glossario, `utenti.md` e `regole-famiglia.md` §1 aggiornati prima del piano |
| II. Calcolo quote puro e testato | ✅ | Nessun calcolo nuovo; viste e famiglia automatica sono funzioni pure testate prima |
| III. Riservatezza (NON-NEGOTIABLE) | ✅ | Import solo per l'amministratore, regole estese e testate; il segno `admin` si mette dalla console |
| IV. Storico per anno | ✅ | Si scrive solo nell'anno scelto; adesioni esistenti valide ("pagamento non registrato") |
| V. Semplicità | ✅ | Una pagina in meno; si riusano i backend esistenti; niente nuove collezioni |

**Esito**: nessuna violazione. **Ri-verifica dopo la fase 1**: invariata.

## Project Structure

### Documentation (this feature)

```text
specs/013-tesserati-semplificati/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── members-api.md         # funzioni pure (families)
│   ├── firestore-changes.md   # pagamento, familyOptOut, admin, regole
│   └── app-routes.md          # Tesserati, pannello, home, rotte
└── tasks.md
```

### Source Code (repository root)

```text
packages/families/src/
├── members-view.ts      # NUOVO: memberYearView, familyAfterConfirm, familyPanel
└── types.ts             # + MemberStatus, MemberYearRow, FamilyPanel

firebase/
├── firestore.rules      # adhesions: + pagamento, + familyOptOut; isAdmin() per l'import
└── tests/rules.test.ts  # + sezione O

apps/web/src/app/
├── core/                         # AuthService.admin, guardia requireAdmin, isAdmin nel backend
├── tesserati/
│   ├── year-backend.ts           # NUOVO: confine unico della pagina (lettura anno, conferma, pagamento, famiglia)
│   ├── firestore-year-backend.ts # NUOVO: riusa riconferme (008), nuovo tesserato (009), famiglie (007), tesserati (011)
│   ├── members.service.ts        # rifatto: elenco unico, filtro, ricerca, conferma, pannello
│   ├── testing.ts
│   └── pages/members/            # pagina + pannello famiglia
├── nuovo-tesserato/              # + data di pagamento; rimando "usa Conferma nell'elenco"
├── riconferme/                   # tolti pagina e servizio; restano backend e tipi
├── pages/home/                   # niente Riconferme; Importa Excel solo amministratore
└── app.routes.ts                 # riconferme → tesserati; importa con requireAdmin
```

**Structure Decision**: un confine unico (`YearBackend`) per la pagina Tesserati, implementato sopra i backend
esistenti, così servizio e pagina si provano con un solo finto.

## Complexity Tracking

| Scelta | Perché | Alternativa scartata |
|---|---|---|
| `familyOptOut` sull'adesione | Ricordare chi è stato tolto a mano (chiarimento B: non va riaggiunto da solo) | Lista di esclusi nella famiglia: si perde se la famiglia viene sciolta |
