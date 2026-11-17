# Implementation Plan: Nuovo tesserato

**Branch**: `009-nuovo-tesserato` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-nuovo-tesserato/spec.md`

## Summary

Modulo **"Nuovo tesserato"** aperto da Riconferme e da Tesserati, più la sezione **"Nuovi tesserati del {anno}"** in
Riconferme con "Annulla iscrizione". Nel pacchetto puro `@tesseramento/import` si aggiungono la **validazione e
pulizia** dei campi del modulo e la **ricerca in archivio** (stessa chiave o codice fiscale → persona esistente; simili
→ scelta; adesione nell'anno precedente → rimando a Riconferme; adesione nell'anno → già iscritta), riusando
`identityKey` e `findCandidates` della 006. In Firestore: persona nuova con `createdManually` (anno, data, email) al
posto di `createdInImport`, creata solo insieme alla sua adesione; adesione con `origin: 'nuovo'`. Le regole delle 008
(cancellazione, anni con tesserati, import che salta) si estendono all'origine "nuovo". In Quote, un anno prima del primo
listino dice che le quote si calcolano solo negli anni con un listino.

## Technical Context

**Language/Version**: TypeScript `~6.0` in modalità `strict`; Node.js 24.x (≥ 22.22.3)

**Primary Dependencies**: nessuna nuova; `@tesseramento/import` (esteso), `@tesseramento/families` (`listForBand`),
`@tesseramento/fees` (`ageFor`, `bandForAge`), Angular 22.2, Material, Firebase 13.4

**Storage**: Cloud Firestore, `persons` (nuova forma "manuale") e `adhesions` (origine "nuovo"); lette
`feeSchedules`, `familyMemberships`, `householdFees`

**Testing**: Vitest (pacchetti e app), emulatori per regole e integrazione

**Target Platform**: browser moderni su PC e telefono (360 px), Firebase Hosting

**Project Type**: web application (`packages/import`, `packages/families`, `apps/web`, `firebase/`)

**Performance Goals**: verifica in archivio istantanea (poche centinaia di persone, in memoria); iscrizione in una
transazione (2 scritture; le regole leggono pochi documenti)

**Constraints**: solo i campi ammessi della persona (constitution III); una adesione per persona per anno; persone
esistenti mai modificate; solo dati finti nei test; nessun nome nei log

**Scale/Scope**: 1 modulo, 1 sezione, ritocchi a Riconferme, Tesserati, Import, Quote, regole

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Valutazione | Note |
|---|---|---|
| I. Dominio fonte di verità | ✅ | `regole-famiglia.md` §1 aggiornato (collegamento a mano in Famiglie); identità di §2 riusata; elenco dalle fasce del listino |
| II. Calcolo quote puro e testato | ✅ | Nessun calcolo nuovo; età e fascia da `@tesseramento/fees`; validazione e ricerca sono funzioni pure testate prima |
| III. Riservatezza (NON-NEGOTIABLE) | ✅ | Solo cognome, nome, data, sesso, codice fiscale; regole "nega tutto" estese e testate; nessun nome nei log |
| IV. Storico per anno | ✅ | Crea solo adesioni dell'anno scelto; persone esistenti e altri anni intatti |
| V. Semplicità | ✅ | Stesse collezioni; riuso di identità e somiglianza della 006 e dello schema della 008 |

**Esito**: nessuna violazione. **Ri-verifica dopo la fase 1**: invariata.

## Project Structure

### Documentation (this feature)

```text
specs/009-nuovo-tesserato/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── new-member-api.md       # funzioni pure (import)
│   ├── firestore-new-member.md # persona manuale, adesione "nuovo", regole
│   └── app-routes.md           # modulo, sezione, testi
└── tasks.md
```

### Source Code (repository root)

```text
packages/import/src/
├── new-member.ts        # NUOVO: validateNewMember, matchNewMember
├── types.ts             # + tipi del modulo, SkipReason 'alreadyAdded'
├── plan-import.ts       # manualIds: riconferma → alreadyRenewed, nuovo → alreadyAdded
└── index.ts

packages/families/src/types.ts   # YearMember.origin + 'nuovo'

firebase/
├── firestore.rules      # persons: + forma manuale; adhesions: + origine "nuovo", delete esteso
└── tests/rules.test.ts  # + sezione M

apps/web/src/app/
├── core/member-years.ts               # + origine "nuovo"
├── nuovo-tesserato/
│   ├── new-member-backend.ts          # interfaccia + token + errori
│   ├── firestore-new-member-backend.ts
│   ├── new-member.service.ts          # modulo (signals), verifica, iscrizione
│   ├── new-member-form.ts             # componente del modulo, usato da Riconferme e Tesserati
│   ├── testing.ts
│   └── firestore-new-member-backend.emulator.test.ts
├── riconferme/…                       # pulsante + sezione "Nuovi tesserati", annulla (riusa undo della 008)
├── tesserati/pages/members/…          # pulsante "Nuovo tesserato"
├── famiglie/firestore-families-backend.ts  # origin 'nuovo'
├── importa/…                          # manualIds, messaggio "inserita a mano"
├── listini/schedule-usage.ts          # in uso anche con soli nuovi
└── quote/fees.service.ts              # testo per l'anno prima del primo listino
```

**Structure Decision**: la ricerca in archivio usa le stesse regole dell'import e sta in `@tesseramento/import`; il
modulo è un componente condiviso dalle due pagine.

## Complexity Tracking

Nessuna deviazione da giustificare.
