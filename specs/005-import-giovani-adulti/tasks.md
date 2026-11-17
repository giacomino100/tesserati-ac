---

description: "Task list for feature 005 – Import Giovani e Adulti"
---

# Tasks: Import Giovani e Adulti

**Input**: Design documents from `/specs/005-import-giovani-adulti/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (import-api-changes.md, firestore-import-changes.md, app-changes.md), quickstart.md

**Tests**: OBBLIGATORI — constitution III (regole modificate: test sull'emulatore prima del rilascio) e logica pura
del pacchetto `import` (test prima del codice, devono fallire prima di passare). I test della 004 restano verdi.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Percorsi relativi alla radice. Solo dati finti (`docs/dominio/excel-esempio/`, nomi inventati, `*@example.org`).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: nessuna dipendenza nuova; verifica della base 004

- [X] T001 Verify the 004 baseline is green on this branch before changing it: `npm run typecheck`, `npm test`, `npm run test:rules` and `npm run test:integration -w web` (set `JAVA_HOME` to the JDK 21 if `java` is not on the PATH); note the counts in the PR

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: il concetto di "elenco" nel pacchetto puro e il contesto dell'anno nel backend, usati da tutte le storie

### Tests first (must FAIL before implementation)

- [X] T002 [P] Write `packages/import/tests/lists.test.ts` (contract import-api-changes.md): `ADHESION_LISTS` = `['ACR','GIOVANI','ADULTI']`; `sectorOf` → `RAGAZZI`/`GIOVANI`/`ADULTI`; `listLabel` → `ACR`/`Giovani`/`Adulti`; `importId(2026,'GIOVANI')` = `'2026-GIOVANI'`; `listOfImportId('2026-ADULTI')` = `'ADULTI'`, `listOfImportId('2026-ALTRO')` = `undefined`; `acrImportId(2026)` still `'2026-ACR'`; `recognizeList`: `['GIOVANI','GIOVANI','ADULTI']` → recognized `GIOVANI`; `['GIOVANI','ADULTI']` → tie `['GIOVANI','ADULTI']` (order of `ADHESION_LISTS`); three-way tie → three candidates; `['ALTRO','ALTRO','GIOVANI']` → `undefined`; `['ALTRO','GIOVANI']` (tie with unknown) → `undefined`; `[]` and `[undefined]` → `undefined`; sectors compared cleaned and uppercase (`' giovani '` counts as `GIOVANI`)

### Implementation

- [X] T003 Create `packages/import/src/lists.ts` with `AdhesionList = 'ACR' | 'GIOVANI' | 'ADULTI'`, `ADHESION_LISTS`, `sectorOf`, `listLabel`, `importId`, `listOfImportId`, `recognizeList` (research R1); make `acrImportId` in `packages/import/src/plan-import.ts` delegate to `importId(year, 'ACR')`; export everything from `packages/import/src/index.ts` — until T002 passes
- [X] T004 Update types in `packages/import/src/types.ts` per data-model.md: `ListRecognition` (`{ kind: 'recognized'; list }` | `{ kind: 'tie'; candidates: AdhesionList[] }`), `ParsedImportOk.recognition`, `ImportError` kind `notAcr` → `unknownList`, `SkipReason` + `'alreadyInYear'`, `SkippedRow.fromList?: AdhesionList`, `ImportPlan.list: AdhesionList`
- [X] T005 Replace `yearStatus` with `yearContext(year): Promise<YearContext>` in `apps/web/src/app/importa/import-backend.ts` (`YearContext` = `{ hasFeeSchedule: boolean; importedLists: AdhesionList[]; persons: Map<string, string>; adhesions: Map<string, AdhesionList> }`), remove `existingPersons()`; `AlreadyImportedError` gets a `list: AdhesionList` field; add `ImportContextChangedError`; update `FakeImportBackend` in `apps/web/src/app/importa/testing.ts` (`importedLists: Set<string>` keyed `"{year}-{list}"`, `adhesions: Map<string, Map<string, AdhesionList>>` per year, `persons`, `feeScheduleYears`; `commit` adds the adhesions and rejects like Firestore) and the existing specs that used `yearStatus`/`importedYears` (`import.service.spec.ts`, `pages/import/import-page.spec.ts`) so they compile and stay green; in the same task give `apps/web/src/app/importa/firestore-import-backend.ts` a working `yearContext` (fee schedule, imported lists, persons, year's adhesions) and adapt `apps/web/src/app/importa/import.service.ts` to it, so `npm run typecheck` stays green at the checkpoint (the per-list commit comes in T013)

**Checkpoint**: `npm test -w @tesseramento/import` and `npm test -w web` green, `npm run typecheck` green

---

## Phase 3: User Story 1 - Importare l'elenco Giovani o Adulti (Priority: P1) 🎯 MVP

**Goal**: i tre elenchi si importano dalla stessa schermata, l'elenco è riconosciuto (o scelto in parità), ogni elenco una volta per anno.

**Independent Test**: con l'ACR 2026 importato, il file Giovani finto → anteprima "Elenco Giovani · anno associativo 2026/27", 8 righe → conferma → 8 adesioni in più; riimporto Giovani rifiutato.

### Tests for User Story 1 ⚠️ (write first, must fail)

- [X] T006 [P] [US1] Extend `packages/import/tests/sample-files.test.ts` and `packages/import/tests/file-errors.test.ts` (Q1–Q3, Q5, Q6): Giovani sample → ok, 2026, 8 rows, `recognized GIOVANI`; Adulti sample → ok, 14 rows, `recognized ADULTI`; ACR sample → `recognized ACR`; replace the 004 `notAcr` expectations: Giovani/Adulti are now ok, a file whose most frequent sector is `ALTRO` → `unknownList`; 3 `GIOVANI` + 1 `ADULTI` → `recognized GIOVANI` and the `ADULTI` row keeps `sector 'ADULTI'`; add to `packages/import/tests/parse-sheet.test.ts`: 2 `GIOVANI` + 2 `ADULTI` → ok with `tie` `['GIOVANI','ADULTI']`
- [X] T007 [P] [US1] Extend `packages/import/tests/plan-import.test.ts` (Q9): `planImport(parsed, 'ADULTI', new Map())` → `list 'ADULTI'`, `importId '2026-ADULTI'`; update the existing 004 cases to the new signature with `'ACR'`
- [X] T008 [P] [US1] Extend `firebase/tests/rules.test.ts` with section "I12–I14, I16 – elenchi Giovani e Adulti": give `batchFor`/`personFor`/`adhesionFor`/`fullImport` an optional `list` parameter (default `'ACR'`, so I1–I11 are unchanged); full import of `GIOVANI` and of `ADULTI` 2026 → allowed; `GIOVANI` 2026 after `ACR` 2026 with a reused person (batch + adhesion only) → allowed; second `GIOVANI` 2026 → denied; `source: 'ALTRO'`, batch ID `2026-GIOVANI` with `source 'ADULTI'`, adhesion `importId '2026-ALTRO'` → denied; unauthenticated and not-listed users cannot write a full `GIOVANI` import (SC-006)
- [X] T009 [P] [US1] Extend `apps/web/src/app/importa/import.service.spec.ts` and `apps/web/src/app/importa/pages/import/import-page.spec.ts` (contract app-changes.md): title "Importa Excel" and new initial text; preview "Elenco Giovani · anno associativo 2026/27" for a sheet of `GIOVANI` rows; tie (`GIOVANI` ×2, `ADULTI` ×2) → "Di quale elenco si tratta?" with buttons "Giovani" and "Adulti", "Importa" disabled until one is chosen, then enabled and the commit uses the chosen list; choosing a list already imported for the year shows "L'elenco Adulti del 2026/27 è già stato importato." and keeps "Importa" disabled; `unknownList` message; already imported list message "L'elenco Giovani del 2026/27 è già stato importato." (both at preview and at commit via `AlreadyImportedError`); summary "Import completato: elenco Giovani, 8 adesioni 2026/27, 8 persone nuove, 0 già presenti."; ACR still works as in 004
- [X] T010 [P] [US1] Extend `apps/web/src/app/importa/firestore-import-backend.emulator.test.ts`: `yearContext(2026)` returns fee schedule, `importedLists`, persons and the year's adhesions with their list; ACR then Giovani then Adulti 2026 from synthetic sheets → three batches `2026-ACR`, `2026-GIOVANI`, `2026-ADULTI`; second Giovani → `AlreadyImportedError` with `list 'GIOVANI'` and nothing written

### Implementation for User Story 1

- [X] T011 [US1] In `packages/import/src/parse-sheet.ts` replace the `notAcr` check with `recognizeList` over the cleaned sectors of all data rows (`undefined` → error `unknownList`) and return `recognition` in the ok result; in `packages/import/src/plan-import.ts` add the `list` parameter (`importId(year, list)`, `plan.list`) — until T006 and T007 pass
- [X] T012 [US1] In `firebase/firestore.rules` change `importBatches` create to `request.resource.data.source in ['ACR', 'GIOVANI', 'ADULTI'] && batchId == string(request.resource.data.associationYear) + '-' + request.resource.data.source` and `adhesions` create to `request.resource.data.importId.matches(string(request.resource.data.associationYear) + '-(ACR|GIOVANI|ADULTI)')` (research R5), updating the comments — until T008 and all 004 rule tests pass (`npm run test:rules`)
- [X] T013 [US1] Implement `yearContext` and the per-list commit in `apps/web/src/app/importa/firestore-import-backend.ts`: parallel reads of `feeSchedules/{Y}`, `query(importBatches, where('associationYear','==',Y))`, all `persons`, `query(adhesions, where('associationYear','==',Y))` (list from `listOfImportId(importId)`); `commit` reads `importBatches/{Y}-{list}` (exists → `new AlreadyImportedError(list)`), `feeSchedules/{Y}`, writes `source: plan.list` — until T010 passes
- [X] T014 [US1] Update `apps/web/src/app/importa/messages.ts` (`unknownList`, `alreadyImportedMessage(year, list)`, remove `notAcr`, `listLabel` for display) and `apps/web/src/app/importa/import.service.ts`: after parsing load `yearContext`, keep `chosenList` (recognized list or user choice in tie), compute the plan in preview with `planImport(parsed, list, context.persons, context.adhesions)`, keep the 004 rejection when `hasFeeSchedule` is false (message and link to Listini), reject an already imported list (in a tie: show the message when that list is chosen and keep `canConfirm` false), expose `listLabel`, `tieCandidates`, `choose(list)`, `canConfirm`; `confirm()` commits the preview plan; `AlreadyImportedError` → rejected with the list message
- [X] T015 [US1] Update `apps/web/src/app/importa/pages/import/import-page.ts`: title "Importa Excel", initial text, preview heading "Elenco {label} · anno associativo {anno}", tie question with one `mat-stroked-button` per candidate (selected one `mat-flat-button`), "Importa" disabled while `!canConfirm()`, summary with the list — until T009 passes

**Checkpoint**: tre elenchi importabili; `npm run test:rules`, `npm run test:integration -w web` verdi

---

## Phase 4: User Story 2 - Persone condivise tra elenchi e anni (Priority: P1)

**Goal**: persone riusate; una persona che ha già un'adesione nell'anno da un altro elenco è saltata ed elencata; i tre file finti danno 37 persone e 37 adesioni.

**Independent Test**: tre file finti del 2026 in sequenza → 37 persone, 37 adesioni, 9 nuclei completi; file Adulti con una riga di un tesserato ACR 2026 → quella riga saltata "già importata nell'elenco ACR del 2026/27".

### Tests for User Story 2 ⚠️ (write first, must fail)

- [X] T016 [P] [US2] Extend `packages/import/tests/plan-import.test.ts` (Q7, Q8): existing person with an `ACR` adhesion in `adhesionsOfYear` → row in `skipped` with `reason 'alreadyInYear'`, `fromList 'ACR'`, excluded from `adhesions`, `newPersons` and `reusedPersons`; existing person without adhesion → reused; skipped rows ordered by row number together with the parse-time ones
- [X] T017 [P] [US2] Write `packages/import/tests/three-lists.test.ts` (Q10, SC-001, SC-002): read the three sample files, plan and "apply" them in sequence in memory (accumulating persons by `identityKey` and adhesions by person) in each of the orders ACR→Giovani→Adulti and Adulti→Giovani→ACR → 37 persons, 37 adhesions, 0 skipped; every `bondId` 900001–900009 has the number of members given by `docs/dominio/excel-esempio/README.md` (2, 3, 4, 6, 2, 3, 2, 3, 2)
- [X] T018 [P] [US2] Extend `firebase/tests/rules.test.ts` (I15): with `adhesions/2026_p1` existing (ACR), a `GIOVANI` 2026 import that also writes `adhesions/2026_p1` → denied and nothing changes
- [X] T019 [P] [US2] Extend `apps/web/src/app/importa/import.service.spec.ts` and `apps/web/src/app/importa/pages/import/import-page.spec.ts`: with the fake backend holding an ACR 2026 adhesion for an identity present in a `ADULTI` sheet → preview "N righe nel file, N−1 da importare" and "Riga 3: già importata nell'elenco ACR del 2026/27"; summary counts exclude it; `ImportContextChangedError` at commit → rejected with "Nel frattempo sono stati importati altri tesserati di questo anno. Ricarica il file e riprova."; a sheet whose valid rows are all `alreadyInYear` → rejected with "Nessuna riga valida da importare." and the skipped list, no commit (spec edge case; the rules would refuse `adhesionCount` 0)
- [X] T020 [P] [US2] Extend `apps/web/src/app/importa/firestore-import-backend.emulator.test.ts`: after ACR 2026, an Adulti sheet containing one ACR person → plan skips it, commit writes only the others; a commit whose plan reuses a person whose `adhesions/2026_{id}` appeared after the context was read → `ImportContextChangedError`, nothing written

### Implementation for User Story 2

- [X] T021 [US2] Implement `alreadyInYear` in `packages/import/src/plan-import.ts` (fourth parameter `adhesionsOfYear`, default empty) until T016 and T017 pass
- [X] T022 [US2] In `apps/web/src/app/importa/firestore-import-backend.ts` `commit`: `tx.get` each `adhesions/{Y}_{personId}` of `plan.reusedPersons` before writing; any existing → throw `ImportContextChangedError` — until T020 passes; re-run `npm run test:rules` for T018
- [X] T023 [US2] In `apps/web/src/app/importa/messages.ts` add the `alreadyInYear` reason ("già importata nell'elenco {label} del {anno}") and the `contextChanged` message; in `apps/web/src/app/importa/import.service.ts` map `ImportContextChangedError` and, when the preview plan has `adhesions === 0`, go to `rejected` with "Nessuna riga valida da importare." and the skipped rows — until T019 passes

**Checkpoint**: US1 + US2 = import completo dei tre elenchi senza doppioni

---

## Phase 5: User Story 3 - Vedere i tesserati di tutti gli elenchi (Priority: P2)

**Goal**: la pagina Tesserati mostra tutti gli elenchi dell'anno con i totali per settore; l'avviso dei listini vale per ogni elenco.

**Independent Test**: dopo i tre import finti, "Tesserati" 2026/27 → "ACR 15 · Giovani 8 · Adulti 14" e 37 righe.

### Tests for User Story 3 ⚠️ (write first, must fail)

- [X] T024 [P] [US3] Extend `apps/web/src/app/tesserati/pages/members/members-page.spec.ts` (contract app-changes.md): totals line "ACR 2 · Giovani 1 · Adulti 1" for members with sectors `RAGAZZI`×2, `GIOVANI`, `ADULTI`; only present sectors ("Adulti 1" alone); unknown sector appended with its export name; order ACR, Giovani, Adulti, others
- [X] T025 [P] [US3] Extend `apps/web/src/app/importa/firestore-import-backend.emulator.test.ts` (FR-011): `FirestoreScheduleUsage.isInUse(2026)` true after importing only `ADULTI` 2026; `apps/web/src/app/tesserati/firestore-members-backend.emulator.test.ts`: `importedYears()` returns 2026 once with three batches of the same year

### Implementation for User Story 3

- [X] T026 [US3] Add the totals per sector to `apps/web/src/app/tesserati/pages/members/members-page.ts` (computed from the loaded rows, labels `RAGAZZI` → "ACR", `GIOVANI` → "Giovani", `ADULTI` → "Adulti", research R7) until T024 passes
- [X] T027 [US3] Change `FirestoreScheduleUsage.isInUse` in `apps/web/src/app/listini/schedule-usage.ts` to `getDocs(query(collection(db, 'importBatches'), where('associationYear', '==', year), limit(1)))` not empty, and update its comment — until T025 passes

**Checkpoint**: tutte le storie funzionano insieme; tutti i test verdi

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T028 [P] Update `packages/import/README.md` (lists, recognition, `alreadyInYear`, new `planImport` signature)
- [X] T029 [P] Privacy check (as 004 T041): no `console.*` or network calls with file contents in `apps/web/src/app/importa`, `apps/web/src/app/tesserati`, `packages/import/src`
- [X] T030 Run full suite: `npm run typecheck`, `npm test`, `npm run test:rules`, `npm run test:integration -w web`, `npm run build -w web` (SheetJS still lazy, no budget warnings)
- [X] T031 [P] Update `docs/roadmap.md` (005 ✅ when released) and `CLAUDE.md` "Stato attuale"
- [ ] T032 Manual scenarios M1–M8 of `specs/005-import-giovani-adulti/quickstart.md` (360 px included)
- [X] T033 Release only after all tests are green and with the user's OK: `npx firebase deploy --only firestore:rules,hosting --project tesseramento-ac`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → stories
- **US1 (Phase 3)**: after Foundational
- **US2 (Phase 4)**: after Foundational; `planImport` signature from T011; backend commit from T013
- **US3 (Phase 5)**: independent of US1/US2 in code; its integration test needs T013
- **Polish (Phase 6)**: after the stories

### Within Each Story

- Tests first (they must fail), then pure package → rules → backend → service → page
- Same file in sequence: `plan-import.ts` T003 → T011 → T021; `import.service.ts` T005 → T014 → T023; `firestore-import-backend.ts` T013 → T022; `rules.test.ts` T008 → T018

### Parallel Opportunities

- US1 tests T006–T010 together; US2 tests T016–T020 together; US3 tests T024–T025 together
- Polish T028, T029, T031 together

---

## Parallel Example: User Story 1

```bash
Task: "T006 sample-files / file-errors (riconoscimento elenco)"
Task: "T007 plan-import (elenco nel piano)"
Task: "T008 rules.test.ts (I12–I14, I16)"
Task: "T009 service/page specs (elenco, parità, messaggi)"
Task: "T010 emulator test (contesto dell'anno, tre segni)"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 + 2
2. Phase 3 (US1): i tre elenchi si importano, uno per anno
3. **STOP and VALIDATE**: Giovani e Adulti finti importati dopo l'ACR

### Incremental Delivery

1. US1 → tre elenchi importabili
2. US2 → nessuna doppia adesione, 37/37 con i file finti
3. US3 → totali per settore, avviso listini per ogni elenco
4. Polish → documentazione, verifica completa, rilascio con il tuo ok

---

## Notes

- I test della 004 si aggiornano solo dove il comportamento cambia per spec (`notAcr` → riconoscimento elenco, firma di `planImport`, `yearStatus` → `yearContext`)
- Mai dati reali
