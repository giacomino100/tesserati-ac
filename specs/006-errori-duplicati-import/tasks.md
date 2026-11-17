---

description: "Task list for feature 006 – Errori e duplicati nell'import"
---

# Tasks: Errori e duplicati nell'import

**Input**: Design documents from `/specs/006-errori-duplicati-import/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (import-api-changes.md, fees-api-additions.md, app-changes.md), quickstart.md

**Tests**: OBBLIGATORI — logica pura di identità e piano (test prima del codice, devono fallire prima di passare);
constitution III (nessun dato nuovo salvato, regole invariate: i test delle regole restano verdi).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Solo dati finti (nomi inventati, file di `docs/dominio/excel-esempio/`). Mai nomi nei log.

---

## Phase 1: Setup

- [ ] T001 Verify the 005 baseline is green on this branch: `npm run typecheck`, `npm test`, `npm run test:rules`, `npm run test:integration -w web` (JDK 21 via `JAVA_HOME`); note the counts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: archivio completo nel piano e nel contesto dell'anno; funzioni d'età esportate. Comportamento invariato.

- [ ] T002 [P] Export `ageFor` and `bandForAge` from `packages/fees/src/index.ts` (contract fees-api-additions.md) and add a small test in `packages/fees/tests/age-band-exports.test.ts` (`ageFor('1996-05-01', 2026)` = 30; `bandForAge(30, SCHEDULE_2026_27)` = `'adulti'`, `bandForAge(4, …)` = `undefined`)
- [ ] T003 Add to `packages/import/src/types.ts` (data-model.md): `ArchivedPerson` (`id`, `lastName`, `firstName`, `birthDate`, `identityKey`, `taxCode?`, `lastAdhesion?: { year: number; list: AdhesionList }`), `DuplicateDecision` (`string` personId | `'new'`), `PossibleDuplicate` (`row`, `candidates: ArchivedPerson[]`, `decision?`), `TaxCodeMatch` (`row`, `person: ArchivedPerson`, `sameKey: boolean`), `SkippedRow.lastName?`/`firstName?`, `ImportPlan.duplicates`, `pendingDuplicates`, `taxCodeMatches`, `confirmedSame`; export them from `packages/import/src/index.ts`
- [ ] T004 Change `planImport` third parameter from `Map<identityKey, personId>` to `readonly ArchivedPerson[]` in `packages/import/src/plan-import.ts` (index by `identityKey` inside; new plan fields empty/0 for now) and update `packages/import/tests/plan-import.test.ts` and `packages/import/tests/three-lists.test.ts` to build the archive (tests stay green)
- [ ] T005 In `apps/web/src/app/importa/import-backend.ts` replace `YearContext.persons` with `archive: ArchivedPerson[]` and add `feeSchedule?: FeeSchedule`; implement in `apps/web/src/app/importa/firestore-import-backend.ts` (read all `adhesions` once to compute each person's `lastAdhesion` — highest year, its list — and the year's adhesions; map `feeSchedules/{Y}` with `documentToStored` from `apps/web/src/app/listini/schedule-mapper.ts`); update `FakeImportBackend` in `apps/web/src/app/importa/testing.ts` (archive with names/birth dates/tax codes, `addMember` keeps working, new `addPerson(person, lastAdhesion?)`), `apps/web/src/app/importa/import.service.ts`, and the emulator test `apps/web/src/app/importa/firestore-import-backend.emulator.test.ts` (archive and `lastAdhesion` of a person imported in 2025 and 2026 = 2026) — all existing tests green

**Checkpoint**: `npm test`, `npm run typecheck`, `npm run test:integration -w web` green, behaviour unchanged

---

## Phase 3: User Story 1 - Decidere i possibili doppioni (Priority: P1) 🎯 MVP

**Goal**: righe simili a persone in archivio da decidere in anteprima; "Importa" bloccato finché non decise.

**Independent Test**: archivio con ROSSI MARIA 1965-03-12, riga ROSSI MARIA GRAZIA 1965-03-12 → possibile doppione; "Stessa persona" → nessuna persona nuova; "Persona diversa" → persona nuova.

### Tests for User Story 1 ⚠️ (write first, must fail)

- [ ] T006 [P] [US1] Write `packages/import/tests/similarity.test.ts` (D1–D3, research R1–R3): `editDistance`; `namesSimilar` true for MARIA/MARA, ANNA/ANA, LUCA/LUCIA, MARCO/MARTA, MARIA/MARIA GRAZIA, GRAZIA/MARIA GRAZIA, accents and spaces normalized; false for ANNA/GIOVANNA, LUCA/MATTEO, identical names; `datesSimilar` true for 1965-03-12/1965-03-13, 1982-11-05/1983-11-05, 1982-11-05/1982-05-11; false for 1982-11-05/1984-12-05, identical dates, day = month swap (1982-05-05); `findCandidates` returns persons with (same date ∧ same last name ∧ similar first name) or (same last and first name ∧ similar date), never the exact-key person
- [ ] T007 [P] [US1] Extend `packages/import/tests/plan-import.test.ts` (D4–D7, D11, D12, D14 in `three-lists.test.ts`): undecided duplicate → in `duplicates`, `pendingDuplicates` 1, not in `newPersons`/`reusedPersons`, not counted in `adhesions`; decision = candidate id → reused, `confirmedSame` 1; decision `'new'` → new person; two candidates listed; two rows decided on the same person → second `duplicate` (`duplicateOf` first row); decision on a person with an adhesion in the year → `alreadyInYear`; the three sample files in sequence → 0 duplicates
- [ ] T008 [P] [US1] Extend `apps/web/src/app/importa/import.service.spec.ts` and `apps/web/src/app/importa/pages/import/import-page.spec.ts` (contract app-changes.md): section "Possibili doppioni (1 da decidere)" with "Riga N: ROSSI MARIA GRAZIA, 12/03/1965" and the candidate "ROSSI MARIA, 12/03/1965 · ACR 2025/26" (no last adhesion → without the "·" part); "Importa" disabled with "Decidi i possibili doppioni prima di importare."; "Stessa persona" / "Persona diversa" enable it, the choice is highlighted and can be changed; totals exclude pending rows; summary "… 1 doppioni confermati"; the commit plan reuses the chosen person
- [ ] T009 [P] [US1] Extend `apps/web/src/app/importa/firestore-import-backend.emulator.test.ts`: archive with ROSSI MARIA (2025), a 2026 import of ROSSI MARIA GRAZIA decided "Stessa persona" → persons unchanged (1), new adhesion `2026_{id}`, the person's names unchanged

### Implementation for User Story 1

- [ ] T010 [US1] Create `packages/import/src/similarity.ts` (`editDistance`, `namesSimilar`, `datesSimilar`, `findCandidates`, using the same normalization as `identity.ts` — extract its `normalize` into a shared export) and export from `packages/import/src/index.ts` — until T006 passes
- [ ] T011 [US1] Extend `planImport` in `packages/import/src/plan-import.ts` with the fifth parameter `decisions: ReadonlyMap<number, DuplicateDecision>` and the decision order of data-model.md (tax code is added in US2) — until T007 passes
- [ ] T012 [US1] In `apps/web/src/app/importa/import.service.ts` keep `decisions` in the preview state, `decide(rowNumber, decision)` recomputes the plan, `canConfirm` also requires `pendingDuplicates === 0`, expose `duplicates()`; summary `confirmedSame`; in `apps/web/src/app/importa/messages.ts` add the duplicate texts; in `apps/web/src/app/importa/pages/import/import-page.ts` add the "Possibili doppioni" section (dates GG/MM/AAAA, `mat-flat-button` for the chosen option, `mat-stroked-button` for the others, layout fit for 360 px) — until T008 passes; re-run T009

**Checkpoint**: possibili doppioni funzionanti end-to-end

---

## Phase 4: User Story 2 - Riconoscere la persona dal codice fiscale (Priority: P1)

**Goal**: il codice fiscale prevale; segnalato in anteprima e nel riepilogo; doppione nello stesso file.

**Independent Test**: archivio NERI ANNA con codice fiscale X; riga NERI ANA con X → attribuita, segnalata, nessun doppione da decidere.

### Tests for User Story 2 ⚠️ (write first, must fail)

- [ ] T013 [P] [US2] Extend `packages/import/tests/plan-import.test.ts` (D8, D9): row with an archived tax code and different name → reused, `taxCodeMatches` with `sameKey` false, not a possible duplicate; row with the key of A and the tax code of B → attributed to B; same tax code and same key → `sameKey` true; extend `packages/import/tests/parse-sheet.test.ts` (D10): two rows with the same valid tax code and different names → second `duplicate` of the first
- [ ] T014 [P] [US2] Extend `apps/web/src/app/importa/import.service.spec.ts` and `apps/web/src/app/importa/pages/import/import-page.spec.ts`: section "Riconosciute dal codice fiscale" with "Riga N: NERI ANA → NERI ANNA, 05/11/1982 (stesso codice fiscale)" only when `sameKey` is false; summary "1 riconosciute dal codice fiscale"

### Implementation for User Story 2

- [ ] T015 [US2] In `packages/import/src/parse-sheet.ts` add the tax-code duplicate check (first row kept); in `packages/import/src/plan-import.ts` add step 1 of the decision order (index `taxCode → person`) and `taxCodeMatches` — until T013 passes
- [ ] T016 [US2] In `apps/web/src/app/importa/import.service.ts`, `messages.ts` and `pages/import/import-page.ts` add the tax-code section and the summary count — until T014 passes

**Checkpoint**: US1 + US2 = identità completa secondo `regole-famiglia.md` §2

---

## Phase 5: User Story 3 - Righe saltate leggibili e avvisi su età e settore (Priority: P2)

**Goal**: righe saltate con cognome e nome; avvisi non bloccanti su età minima e settore secondo il listino.

**Independent Test**: file ACR finto → 1 avviso (GATTI MIA, 4 anni), 15 da importare; riga senza data → "Riga N (COGNOME NOME): manca la data di nascita".

### Tests for User Story 3 ⚠️ (write first, must fail)

- [ ] T017 [P] [US3] Extend `packages/import/tests/parse-sheet.test.ts` (D13): skipped rows carry cleaned `lastName`/`firstName` when present, none when absent; `packages/import/tests/sample-files.test.ts`: ACR sample still 0 skipped
- [ ] T018 [P] [US3] Write `apps/web/src/app/importa/age-warnings.spec.ts` (research R7) with `SCHEDULE_2026_27`: 2022 birth → `belowMinimumAge` age 4; 1996 `GIOVANI` → `sectorMismatch` age 30 expected `ADULTI`; 2010 `RAGAZZI` (16) → expected `GIOVANI`; 2016 `RAGAZZI`, 2001 `GIOVANI`, 1970 `ADULTI` → no warning; the 15 ACR sample-like rows of the README → exactly 1 warning
- [ ] T019 [P] [US3] Extend `apps/web/src/app/importa/import.service.spec.ts` and `pages/import/import-page.spec.ts`: "Riga 3 (PROVA ALFA): manca la data di nascita" and "Riga 4: manca il cognome" (no name when both missing); "Avvisi" section with "Riga 14 (GATTI MIA): 4 anni, sotto l'età minima di 6 anni del listino" and "Riga 3 (PROVA ALFA): 30 anni: per il listino è Adulti, nell'export è GIOVANI"; warnings do not disable "Importa"; summary "1 avvisi"

### Implementation for User Story 3

- [ ] T020 [US3] Add `lastName`/`firstName` to skipped rows in `packages/import/src/parse-sheet.ts` — until T017 passes
- [ ] T021 [US3] Create `apps/web/src/app/importa/age-warnings.ts` (`ageWarnings(rows, schedule)` using `ageFor`/`bandForAge` from `@tesseramento/fees`; group `acr → RAGAZZI`, `giovanissimi | giovani → GIOVANI`, `adulti → ADULTI`) — until T018 passes
- [ ] T022 [US3] In `apps/web/src/app/importa/messages.ts` (`skippedMessage` with name, warning texts), `import.service.ts` (`warnings()` from `context.feeSchedule`, summary count) and `pages/import/import-page.ts` ("Avvisi" section) — until T019 passes

**Checkpoint**: tutte le storie; tutti i test verdi

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T023 [P] Update `packages/import/README.md` (similarity, archive, decisions, tax code) and `packages/fees/README.md` (new exports)
- [ ] T024 [P] Privacy check: no `console.*` or network calls in `apps/web/src/app/importa`, `packages/import/src`; no new fields written (compare `firestore-import-backend.ts` documents with the 004 data model)
- [ ] T025 Run full suite: `npm run typecheck`, `npm test`, `npm run test:rules` (unchanged), `npm run test:integration -w web`, `npm run build -w web`
- [ ] T026 [P] Update `docs/roadmap.md` (006 ✅ when released) and `CLAUDE.md`
- [ ] T027 Manual scenarios M1–M6 of `specs/006-errori-duplicati-import/quickstart.md`
- [ ] T028 Release only with all tests green and the user's OK: `npx firebase deploy --only hosting --project tesseramento-ac` (rules unchanged)

---

## Dependencies & Execution Order

- Setup → Foundational (T002–T005) → US1 → US2 → US3 → Polish
- US2 and US3 depend only on Foundational in principle, but share `plan-import.ts`, `parse-sheet.ts`, `import.service.ts`, `import-page.ts` with US1: run them in story order
- Same file in sequence: `plan-import.ts` T004 → T011 → T015; `parse-sheet.ts` T015 → T020; `import.service.ts` T005 → T012 → T016 → T022; `import-page.ts` T012 → T016 → T022

### Parallel Opportunities

- T002 with T003; US1 tests T006–T009 together; US2 tests T013–T014; US3 tests T017–T019; Polish T023, T024, T026

---

## Parallel Example: User Story 1

```bash
Task: "T006 similarity.test.ts"
Task: "T007 plan-import.test.ts (doppioni e scelte)"
Task: "T008 service/page specs (sezione doppioni)"
Task: "T009 emulator test (Stessa persona)"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 + 2 (nessun cambiamento visibile)
2. Phase 3: possibili doppioni decisi in anteprima
3. **STOP and VALIDATE** con l'archivio di prova

### Incremental Delivery

1. US1 → doppioni
2. US2 → codice fiscale
3. US3 → righe saltate con nome, avvisi
4. Polish → rilascio solo hosting, con il tuo ok
