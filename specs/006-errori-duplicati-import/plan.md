# Implementation Plan: Errori e duplicati nell'import

**Branch**: `006-errori-duplicati-import` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-errori-duplicati-import/spec.md`

## Summary

L'anteprima dell'import diventa una "revisione": nel pacchetto puro `@tesseramento/import` si aggiungono la
**somiglianza** tra persone (nome entro 2 lettere o contenuto, data entro una cifra o giorno/mese scambiati), il
**riconoscimento dal codice fiscale** e un `planImport` che riceve l'archivio completo e le **scelte dell'utente** sui
possibili doppioni; le righe saltate portano cognome e nome (solo in memoria). Gli **avvisi** su età e settore usano
le età del listino dell'anno tramite funzioni pure di `@tesseramento/fees`. L'app carica nel contesto dell'anno
l'anagrafica completa, l'ultima adesione di ogni persona e il listino; la pagina di import mostra doppioni da
decidere, riconoscimenti dal codice fiscale e avvisi, e blocca "Importa" finché ci sono doppioni senza scelta.
Nessun campo nuovo in Firestore, regole invariate.

## Technical Context

**Language/Version**: TypeScript `~6.0` in modalità `strict`; Node.js 24.x (≥ 22.22.3)

**Primary Dependencies**: nessuna nuova (`@tesseramento/import`, `@tesseramento/fees`, Angular 22.2, Material, Firebase 13.4)

**Storage**: Cloud Firestore, collezioni esistenti; **nessun campo nuovo, regole invariate**

**Testing**: Vitest (pacchetti e app), emulatori per l'integrazione (contesto dell'anno con anagrafica e ultime adesioni)

**Target Platform**: browser moderni su PC e telefono (360 px), Firebase Hosting

**Project Type**: web application (modifica `packages/import`, `packages/fees` in modo additivo, `apps/web`)

**Performance Goals**: anteprima entro 5 s come in 004: confronto di ~90 righe con alcune centinaia di persone
(≈ 50.000 confronti di stringhe brevi, millisecondi)

**Constraints**: nomi solo a schermo, mai nei log, nessun dato nuovo salvato; scelte sui doppioni solo in memoria

**Scale/Scope**: poche centinaia di persone e adesioni per anno; nessuna schermata nuova

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Valutazione | Note |
|---|---|---|
| I. Dominio fonte di verità | ✅ | Identità e casi dubbi da `regole-famiglia.md` §2, aggiornato prima della spec con la conferma dell'utente; età e fasce degli avvisi lette dal listino dell'anno, non scritte nel codice |
| II. Calcolo quote puro e testato | ✅ | Le età degli avvisi riusano `ageFor`/`bandForAge` di `@tesseramento/fees` (esportazioni additive, nessun calcolo nuovo); somiglianza e piano sono funzioni pure testate prima |
| III. Riservatezza (NON-NEGOTIABLE) | ✅ | Nessun campo nuovo salvato; nomi delle righe saltate e dei doppioni solo a schermo; nessun log; regole invariate (test della 004/005 restano verdi) |
| IV. Storico per anno | ✅ | "Stessa persona" aggiunge solo l'adesione dell'anno; l'anagrafica salvata non cambia mai |
| V. Semplicità | ✅ | Nessuna libreria (distanza di Levenshtein scritta a mano, ~15 righe); nessuna schermata nuova |

**Esito**: nessuna violazione. **Ri-verifica dopo la fase 1**: invariata.

## Project Structure

### Documentation (this feature)

```text
specs/006-errori-duplicati-import/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── import-api-changes.md   # somiglianza, archivio, scelte, codice fiscale, righe saltate con nome
│   ├── fees-api-additions.md   # esportazione di ageFor / bandForAge
│   └── app-changes.md          # anteprima: doppioni, codice fiscale, avvisi, riepilogo
└── tasks.md
```

### Source Code (repository root)

```text
packages/import/src/
├── similarity.ts      # NUOVO: editDistance, namesSimilar, datesSimilar, findCandidates
├── parse-sheet.ts     # righe saltate con cognome/nome; doppione per codice fiscale nello stesso file
├── plan-import.ts     # archivio completo, codice fiscale, possibili doppioni, scelte dell'utente
└── types.ts           # ArchivedPerson, DuplicateDecision, PossibleDuplicate, TaxCodeMatch

packages/fees/src/index.ts   # + export ageFor, bandForAge (additivo)

apps/web/src/app/importa/
├── import-backend.ts           # YearContext: archive (persone + ultima adesione), feeSchedule
├── firestore-import-backend.ts # legge tutte le adesioni per l'ultima di ogni persona e il listino
├── age-warnings.ts             # NUOVO: avvisi età/settore dal listino (puro, usa @tesseramento/fees)
├── import.service.ts           # scelte sui doppioni, avvisi, riepilogo esteso
├── messages.ts                 # testi nuovi
└── pages/import/import-page.ts # sezioni Doppioni, Codice fiscale, Avvisi
```

**Structure Decision**: tutta la logica di identità resta nel pacchetto puro (`@tesseramento/import`); gli avvisi
d'età vivono nell'app perché uniscono righe dell'import e listino, ma usano solo funzioni pure dei due pacchetti.

## Complexity Tracking

| Rischio | Perché è tracciato | Mitigazione |
|---|---|---|
| Falsi positivi tra fratelli/gemelli (stessa data e cognome, nomi corti simili, es. LUCA/LUCIA) | La regola "2 lettere" li segnala come possibili doppioni | È voluto: la decisione è dell'utente ("Persona diversa"); dall'anno dopo la corrispondenza è esatta e non vengono più chiesti |
| Lettura di tutte le adesioni per l'"ultimo elenco e anno" | Cresce di ~165 documenti l'anno | Accettabile per anni; se servisse, un indice per persona in una specifica futura |
