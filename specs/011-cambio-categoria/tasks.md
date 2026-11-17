---

description: "Task list for feature 011 – Cambio categoria per età"
---

# Tasks: Cambio categoria per età

**Input**: Design documents from `/specs/011-cambio-categoria/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (categories-api.md, firestore-list-change.md, app-routes.md), quickstart.md

**Tests**: OBBLIGATORI — constitution III (nuova regola di aggiornamento di `adhesions`: test sull'emulatore) e
pratica del progetto (logica pura testata prima del codice).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Solo dati finti e persone inventate. Mai nomi nei log. Nessun altro campo dell'adesione cambia.

---

## Phase 1: Setup

- [X] T001 Verify the 009 baseline is green on this branch (`npm run typecheck`, `npm test`, `npm run test:rules`, `npm run test:integration -w web`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: elenco per età condiviso, elenco attuale con precedenza, righe di Tesserati con i dati dell'adesione.

- [X] T002 [P] Tests C1 and C8 in `packages/families/tests/categories.test.ts` (`listForAge` at 5, 6, 14, 15, 29, 30 and an invalid date; renewal view results unchanged); then implement `listForAge(birthDate, year, schedule)` in `packages/families/src/categories.ts` and use it in `packages/families/src/renewals.ts`; export from `index.ts`
- [X] T003 [P] Test C9 in `packages/import/tests/lists.test.ts` (`listOfAdhesion('2026-GIOVANI', 'ADULTI')` → `ADULTI`); then give `list` precedence in `listOfAdhesion` (`packages/import/src/lists.ts`) and update the existing I1 expectation
- [X] T004 Extend `MemberRow` in `apps/web/src/app/tesserati/members-backend.ts` with `adhesionId`, `personId`, `list`, `exportSector?`, `listChange?` (`from`, `at`, `by`, `note?`) and the methods `schedule(year)` and `changeList(changes, email)` (interface only); read them in `firestore-members-backend.ts` (`list` via `listOfAdhesion`); create the shared fake `apps/web/src/app/tesserati/testing.ts` and switch `members-page.spec.ts` to it

**Checkpoint**: tutti i test esistenti verdi

---

## Phase 3: User Story 1 - Vedere chi non è allineato (Priority: P1) 🎯 MVP

**Goal**: colonna Elenco, avviso "Per età: …", conteggio in cima.

**Independent Test**: dati finti 2026/27 → 0 non allineate; ROSSI ELENA 1996 in Giovani → "1 adesione non allineata all'età" e "Per età: Adulti".

### Tests for User Story 1 (write first, must fail)

- [X] T005 [P] [US1] Tests C2–C5 in `packages/families/tests/categories.test.ts` (`listStatus`: fake files all `aligned`; ROSSI ELENA `misaligned` ADULTI; GRECO NICOLO exception `exception` with `expected` GIOVANI; no schedule → `unknown`)
- [X] T006 [P] [US1] Write `apps/web/src/app/tesserati/members.service.spec.ts` and extend `members-page.spec.ts`: column "Elenco" (header list updated), "1 adesione non allineata all'età", "Per età: Adulti", "(export: GIOVANI)" when different, no warnings without schedule

### Implementation for User Story 1

- [X] T007 [US1] Implement `listStatus` in `packages/families/src/categories.ts` (+ `ListStatus` in `types.ts`, `YearMember.exception?`)
- [X] T008 [US1] Create `apps/web/src/app/tesserati/members.service.ts` (signals: years, year, rows, schedule, statuses, texts) and move the page logic there; update `members-page.ts` (column Elenco with warnings; keep year choice, totals and the 009 new-member form)

**Checkpoint**: US1 visibile e testata

---

## Phase 4: User Story 2 - Allineare all'età (Priority: P1)

**Goal**: "Allinea all'età" per riga e "Allinea tutte" con conferma.

**Independent Test**: due trentenni in Giovani → "2 adesioni cambieranno elenco. Confermi?" → entrambe Adulti, elenco di prima conservato; quote invariate.

### Tests for User Story 2 (write first, must fail)

- [X] T009 [P] [US2] Test C6 (`alignAllPlan`) in `packages/families/tests/categories.test.ts`
- [X] T010 [P] [US2] Extend `firebase/tests/rules.test.ts` with section "N – cambio di elenco" N1, N3–N6 (contracts/firestore-list-change.md): `update` of only `list`, `sector`, `exportSector`, `listChange { from, at: serverTimestamp, by, note? }`; other fields, incoherent sector, foreign `at`/`by`, extra keys, wrong or changed `exportSector` denied; 150 updates in one batch allowed; unauthorized denied
- [X] T011 [P] [US2] Write `apps/web/src/app/tesserati/firestore-members-backend.emulator.test.ts` E1, E3 additions (`changeList` on an imported adhesion; `membersOfYear` and families `yearMembers` read the new list)
- [X] T012 [P] [US2] Extend `members.service.spec.ts` / `members-page.spec.ts`: "Allinea all'età", dialog "2 adesioni cambieranno elenco. Confermi?", "2 adesioni allineate all'età.", exceptions excluded, network error "Impossibile salvare. Controlla la connessione e riprova. Non è stato salvato nulla."

### Implementation for User Story 2

- [X] T013 [US2] Implement `alignAllPlan` in `packages/families/src/categories.ts`
- [X] T014 [US2] Add the `update` rule to `match /adhesions/{adhesionId}` in `firebase/firestore.rules` (research R6)
- [X] T015 [US2] Implement `changeList` in `apps/web/src/app/tesserati/firestore-members-backend.ts` (`runTransaction` with `update`, groups of 400; `sector = sectorOf(list)`; `exportSector` from the previous `sector` for imported adhesions without it; `listChange.at = serverTimestamp()`, `by` lowercase) and `schedule(year)`; provider unchanged
- [X] T016 [US2] Add align / align-all flows to `members.service.ts` and `members-page.ts`

**Checkpoint**: US1 + US2 = prodotto minimo

---

## Phase 5: User Story 3 - Eccezione decisa a mano (Priority: P2)

**Goal**: "Cambia elenco" con nota, "Togli eccezione", avviso in Riconferme.

**Independent Test**: GRECO NICOLO in ACR con nota → "ACR · eccezione: resta in ACR un anno in più"; Allinea tutte non lo tocca; Riconferme 2027/28 → "L'anno scorso era un'eccezione: ACR".

### Tests for User Story 3 (write first, must fail)

- [X] T017 [P] [US3] Test C7 in `packages/families/tests/renewals.test.ts` (`previousException`)
- [X] T018 [P] [US3] Extend `rules.test.ts` N2 (note present 1–200 chars allowed; empty or 201 chars denied) and the members emulator test E2 (exception and remove exception)
- [X] T019 [P] [US3] Extend `members.service.spec.ts` / `members-page.spec.ts` ("Cambia elenco", "Scrivi una nota che spieghi l'eccezione.", "La nota può avere al massimo 200 caratteri.", exception row text, "Togli eccezione" with and without schedule) and `apps/web/src/app/riconferme/renewals.service.spec.ts` ("L'anno scorso era un'eccezione: ACR")

### Implementation for User Story 3

- [X] T020 [US3] Add `previousException` to `renewalView` in `packages/families/src/renewals.ts` and its text in `apps/web/src/app/riconferme/renewals.service.ts`; set `exception: true` from `listChange.note` in `yearMembers` of `apps/web/src/app/famiglie/firestore-families-backend.ts`
- [X] T021 [US3] Add change-with-note and remove-exception flows to `members.service.ts` and `members-page.ts` (note trimmed, 1–200 characters)

**Checkpoint**: tutte le storie; tutti i test verdi

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T022 [P] Update `packages/families/README.md` (`listForAge`, `listStatus`, `alignAllPlan`, `previousException`) and `packages/import/README.md` (`listOfAdhesion` precedence)
- [X] T023 [P] Privacy check: no `console.*`, no names in logs in `apps/web/src/app/tesserati` and the new package code
- [X] T024 Run full suite: `npm run typecheck`, `npm test`, `npm run test:rules`, `npm run test:integration -w web`, `npm run build -w web`
- [X] T025 [P] Update `docs/roadmap.md` (011 🚧, ✅ when released) and `CLAUDE.md`
- [ ] T026 Manual scenarios M1–M5 of `specs/011-cambio-categoria/quickstart.md`
- [ ] T027 Release only with all tests green and the user's OK: `npx firebase deploy --only firestore:rules,hosting --project tesseramento-ac`

---

## Dependencies & Execution Order

- Setup → Foundational → US1 → US2 → US3 → Polish
- Same file in sequence: `categories.ts` T002 → T007 → T013; `categories.test.ts` T002 → T005 → T009; `members.service.ts`/`members-page.ts` T008 → T016 → T021; `firestore-members-backend.ts` T004 → T015; `rules.test.ts` T010 → T018; `renewals.ts` T002 → T020

### Parallel Opportunities

- T002 with T003; US1 tests T005–T006; US2 tests T009–T012; US3 tests T017–T019; Polish T022, T023, T025

---

## Parallel Example: User Story 2

```bash
Task: "T009 alignAllPlan test"
Task: "T010 rules N"
Task: "T011 members emulator test"
Task: "T012 align flows specs"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Phase 1 + 2
2. Phase 3: vedere i non allineati
3. Phase 4: allineare
4. **STOP and VALIDATE**: 0 non allineate sui dati finti; due trentenni allineati

### Incremental Delivery

- US3 (eccezioni) completa la specifica; rilascio di regole + hosting dopo i test verdi e l'ok.
