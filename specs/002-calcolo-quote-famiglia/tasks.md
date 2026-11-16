---

description: "Task list for feature 002 – Calcolo quota famiglia"
---

# Tasks: Calcolo quota famiglia

**Input**: Design documents from `/specs/002-calcolo-quote-famiglia/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/fees-api.md, quickstart.md

**Tests**: OBBLIGATORI — constitution, principio II: ogni esempio di `docs/dominio/regole-quote.md`
è un test; i test si scrivono prima dell'implementazione e devono fallire prima di passare.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Percorsi relativi alla radice del repository; il pacchetto vive in `packages/fees/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: workspace npm e pacchetto `@tesseramento/fees` vuoto ma compilabile e testabile

- [X] T001 Create root `package.json`: `"private": true`, `"workspaces": ["packages/*"]`, `"engines": { "node": ">=22.12" }`, scripts `"test": "npm test --workspaces --if-present"` and `"typecheck": "npm run typecheck --workspaces --if-present"`; no dependencies
- [X] T002 [P] Create `tsconfig.base.json` with `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`, `"noImplicitOverride": true`, `"target": "ES2022"`, `"module": "ESNext"`, `"moduleResolution": "Bundler"`, `"isolatedModules": true`, `"skipLibCheck": true`
- [X] T003 [P] Create `packages/fees/package.json`: name `@tesseramento/fees`, `"private": true`, `"type": "module"`, `"exports": { ".": "./src/index.ts" }`, **no `dependencies`**, devDependencies `typescript` `~6.0` (Angular 22 requires `>=6.0 <6.1`, research R2) and `vitest` `^5.1`, scripts `"test": "vitest run"` and `"typecheck": "tsc --noEmit -p tsconfig.json"`
- [X] T004 [P] Create `packages/fees/tsconfig.json` extending `../../tsconfig.base.json`, `"noEmit": true`, include `src/**/*.ts` and `tests/**/*.ts`; and `packages/fees/vitest.config.ts` with `test.include: ['tests/**/*.test.ts']`
- [X] T005 Run `npm install` at repo root and commit `package-lock.json`; verify `node_modules/` is ignored by `.gitignore`

**Checkpoint**: `npm run typecheck -w @tesseramento/fees` runs (no source yet)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tipi, listino, fascia, ordinamento, validazione, fixture degli esempi — servono a tutte le user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Create `packages/fees/src/types.ts` with all types of `data-model.md`, identifiers in English: `AgeBand = 'acr' | 'giovanissimi' | 'giovani' | 'adulti'`; `BandFee { band; minAge; maxAge?; fullCents; discountedCents }` ("discountedCents: intero > 0, ≤ fullCents — quota 'Percentuale del 20%' del PDF, non calcolata"); `FeeSchedule { associationYear; label; minAge; bands; acrPackageCents; maxHouseholdSize }`; `HouseholdMember { id; lastName; firstName; birthDate }` (birthDate "YYYY-MM-DD"); `HouseholdFeeInput { associationYear; members; schedule }`; `Benefit = 'none' | 'discount20' | 'free' | 'inAcrPackage'`; `MemberFeeLine { memberId; age; band; fullCents; benefit; amountCents? }` ("amountCents assente se benefit = 'inAcrPackage'"); `AcrPackageLine { amountCents; memberIds: [string, string] }`; `NotCoveredReason = 'householdTooLarge' | 'memberUnderMinAge'`; `InvalidInputCode = 'scheduleYearMismatch' | 'invalidBirthDate' | 'birthDateAfterYear' | 'duplicateMemberId'`; `HouseholdFeeResult` discriminated union on `status`: `'calculated'` (`members`, `acrPackage?`, `totalCents`), `'notCovered'` (`reasons` non-empty, `members: { memberId; age; band? }[]`, no amounts), `'invalidInput'` (`errors: { code; memberId? }[]`). All fields `readonly`.
- [X] T007 [P] Create `packages/fees/src/schedules/2026-27.ts` exporting `SCHEDULE_2026_27: FeeSchedule` exactly from the PDF (`docs/dominio/fonti/quote-tesseramento-2026-27.pdf`, table in `data-model.md`): `associationYear: 2026`, `label: '2026/27'`, `minAge: 6`, `acrPackageCents: 2500`, `maxHouseholdSize: 4`, bands acr 6–14 1500/1200, giovanissimi 15–18 1600/1300, giovani 19–29 2200/1800, adulti 30–(no max) 2600/2100; freeze the object deeply
- [X] T008 [P] Write failing tests `packages/fees/tests/age-band.test.ts` for `bandFor(birthDate, schedule)` with `SCHEDULE_2026_27` (FR-001, age = 2026 − birth year, day/month ignored): 2021-01-01 → undefined (age 5); 2020-12-31 → acr (6); 2012-01-01 → acr (14); 2011-06-15 → giovanissimi (15); 2008-12-31 → giovanissimi (18); 2007-01-01 → giovani (19); 1997-12-31 → giovani (29); 1996-12-31 → adulti (30); 1940-05-05 → adulti
- [X] T009 Implement `packages/fees/src/age-band.ts`: `ageFor(birthDate, associationYear)` = associationYear − year of birthDate; `bandFor(birthDate, schedule)` returns the band whose `[minAge, maxAge]` contains the age, `undefined` below `schedule.minAge`; no use of current date (makes T008 pass)
- [X] T010 [P] Write failing tests `packages/fees/tests/order.test.ts` and implement `packages/fees/src/order.ts` `orderMembers(members)` (FR-003): ascending `birthDate` (oldest first), ties by `lastName`, then `firstName`, then `id`; returns a new array and never mutates the input
- [X] T011 [P] Write failing tests `packages/fees/tests/validate.test.ts` and implement `packages/fees/src/validate.ts` `validateInput(input)` returning the list of errors: `scheduleYearMismatch` when `input.associationYear !== schedule.associationYear`; `invalidBirthDate` (with `memberId`) when not `YYYY-MM-DD`, not a real calendar date (e.g. `2015-02-30`), or age above `MAX_PLAUSIBLE_AGE = 110` (exported constant in `validate.ts`; test: 1916-01-01 → age 110 valid, 1915-12-31 → age 111 invalid); `birthDateAfterYear` (with `memberId`) when birthDate > `<associationYear>-12-31`; `duplicateMemberId` (with `memberId`) for repeated ids
- [X] T012 Create `packages/fees/src/index.ts` exporting only the contract surface (`contracts/fees-api.md`): all types, `SCHEDULE_2026_27`, `bandFor`, and `calculateHouseholdFee` from `packages/fees/src/household-fee.ts`, which for now is a stub throwing `Error('not implemented')`
- [X] T013 Create `packages/fees/tests/fixtures/examples.ts`: the 29 cases of `docs/dominio/regole-quote.md` §3.1 (cases 1–18) and §3.2 (cases 19–29), each `{ caseNumber, description, members, expectedTotalCents }` with the description copied from the document. Use fake members with distinct birth dates in 2026/27 bands: Adulti born 1960–1990, Giovani 1998–2006, Giovanissimi 2008–2011, ACR 2012–2020; case 28 uses Giovani born 2000 and 2003; case 29 uses a member born 1996 (30 → adulti). Totals in cents (e.g. 70,00 → 7000)
- [X] T014 Write `packages/fees/tests/examples-sync.test.ts`: read `docs/dominio/regole-quote.md` (path resolved from the test file), parse the rows of the two tables in §3 (`| <n> | <nucleo> | <totale> | …`, totale like `70,00`), and assert the set of case numbers is exactly 1–29 and each total equals `expectedTotalCents` in the fixture (research R8)

**Checkpoint**: `npm test -w @tesseramento/fees` → age-band, order, validate and examples-sync pass; nothing tests `calculateHouseholdFee` yet

---

## Phase 3: User Story 1 - Quota di un nucleo fino a 3 persone (Priority: P1) 🎯 MVP

**Goal**: quote piene, pacchetto 2 ACR e sconto del 20% sul più giovane per nuclei da 0 a 3 persone

**Independent Test**: examples 1–24 and 29 from the fixture give the expected total; no UI or storage

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T015 [P] [US1] Write `packages/fees/tests/examples.test.ts` (`describe('examples')`): data-driven `it.each` over fixture cases with ≤ 3 members (1–24, 29) asserting `status === 'calculated'` and `totalCents === expectedTotalCents`, test name `caso <n>: <description>`
- [X] T016 [P] [US1] Write `packages/fees/tests/us1-details.test.ts` for the 6 acceptance scenarios of spec US1 with full detail: single 1980 → adulti, benefit `none`, 2600; 2 ACR → both `inAcrPackage` without `amountCents`, `acrPackage = { amountCents: 2500, memberIds: [older, younger] }`, total 2500; 1 Adulto + 1 ACR → no benefit, 4100; 2 Adulti + 1 Giovane → giovane `discount20` 1800, total 7000; 1 Adulto + 2 ACR → adulto 2600, both ACR `inAcrPackage`, package 2500, total 5100; 3 ACR → two oldest `inAcrPackage`, youngest `discount20` 1200, total 3700; in every case assert `totalCents` = sum of `amountCents` + `acrPackage?.amountCents` (contract G3)
- [X] T017 [P] [US1] Write `packages/fees/tests/edge-cases.test.ts`: empty `members` → `calculated`, `members: []`, `totalCents: 0`, no `acrPackage`; same members in different input order → deep-equal results (G1); input object deep-frozen does not throw and is unchanged (G5); twins (same birthDate, different names) → benefit always on the same member (order by lastName/firstName); `scheduleYearMismatch` and `invalidBirthDate` inputs → `status: 'invalidInput'` with those codes and no amounts

### Implementation for User Story 1

- [X] T018 [US1] Implement `calculateHouseholdFee` in `packages/fees/src/household-fee.ts`: (1) `validateInput` → `invalidInput` if errors; (2) order members with `orderMembers`; compute `age` and `band` with `age-band.ts`; (3) apply rules for n ≤ 3 exactly as `data-model.md` "Regole di calcolo": n=0 total 0; n=1 or n=2 with r<2 full fees; n=2 r=2 both `inAcrPackage` + `acrPackage` with `schedule.acrPackageCents`; n=3 r<2 youngest `discount20` (`discountedCents` from schedule); n=3 r=2 the two ACR `inAcrPackage` + package, third full; n=3 r=3 two oldest `inAcrPackage` + package, youngest `discount20`; (4) `totalCents` = sum. All amounts read from `schedule` — no percentages or rounding in code (FR-002). Until US2/US3, households with n ≥ 4 return `notCovered` with reason `householdTooLarge` (provisional, replaced in T020)
- [X] T019 [US1] Run `npm test -w @tesseramento/fees` and `npm run typecheck -w @tesseramento/fees`; T015–T017 must pass

**Checkpoint**: MVP — every household up to 3 people is calculated per the PDF

---

## Phase 4: User Story 2 - Quota di un nucleo di 4 persone (Priority: P2)

**Goal**: regola dei 4: il 3° (secondo più giovane) −20%, il 4° (il più giovane) gratis, nessun pacchetto ACR

**Independent Test**: examples 25–28 give the expected totals

### Tests for User Story 2 ⚠️

- [X] T020 [P] [US2] Extend `packages/fees/tests/examples.test.ts` to include fixture cases with 4 members (25–28), and write `packages/fees/tests/us2-details.test.ts`: 2 Adulti + 1 Giovane + 1 ACR → giovane `discount20` 1800, ACR `free` with `amountCents: 0`, total 7000; 2 Adulti + 2 ACR → older ACR `discount20` 1200, younger ACR `free`, **no `acrPackage`**, total 6400; 1 Adulto + Giovane 2000 + Giovane 2003 + Giovanissimo → giovane 2003 `discount20` 1800, giovanissimo `free`, total 6600

### Implementation for User Story 2

- [X] T021 [US2] In `packages/fees/src/household-fee.ts` replace the provisional n=4 branch: members 1–2 full fee, member 3 `discount20`, member 4 `free` (`amountCents: 0`), no `acrPackage` (FR-009); keep n ≥ 5 provisional `notCovered`; run tests

**Checkpoint**: US1 and US2 both pass

---

## Phase 5: User Story 3 - Segnalazione dei casi non previsti dal PDF (Priority: P3)

**Goal**: nuclei con più di `maxHouseholdSize` componenti o con un componente sotto `minAge` → `notCovered` per tutto il nucleo, senza importi

**Independent Test**: households of 5, 6 and one containing a child born 2022 → `notCovered`, reason given, no amounts

### Tests for User Story 3 ⚠️

- [X] T022 [P] [US3] Write `packages/fees/tests/not-covered.test.ts` (`describe('not covered')`): 5 members → reasons `['householdTooLarge']`; 6 members → `['householdTooLarge']`; 2 Adulti + child born 2022 → `['memberUnderMinAge']`, child entry has `age: 4` and no `band`; single child born 2022 → `['memberUnderMinAge']`; 6 members including one born 2022 → both reasons; in every case `members` lists all components with `memberId` and `age` and the result has no `totalCents`, `amountCents` or `acrPackage` (FR-010, G4)
- [X] T023 [P] [US3] Create `packages/fees/tests/fixtures/sample-households.ts` with the fake households of `docs/dominio/excel-esempio/genera_esempi.py` (birth dates copied from that script, ids `900001`… for nuclei and `S1`… for singles) and write `packages/fees/tests/sample-households.test.ts` (`describe('sample households')`, SC-003): expected 900001 → 5200; 900002 → 6400; 900003 → 6400; 900004 → `notCovered` `householdTooLarge`; 900005 → 2500; 900006 → 4100; 900007 → 4100; 900008 → 5400; 900009 → 4800; singles born 1955, 1960, 1990 → 2600 each; 2001 → 2200; 2008 → 1600; 2012, 2015, 2017, 2019 → 1500 each; 2022 → `notCovered` `memberUnderMinAge`

### Implementation for User Story 3

- [X] T024 [US3] In `packages/fees/src/household-fee.ts`, after validation and before applying rules, return `notCovered` for the whole household when `members.length > schedule.maxHouseholdSize` (`householdTooLarge`) and/or any member has age < `schedule.minAge` (`memberUnderMinAge`), listing every member with `memberId`, `age` and `band` (omitted under `minAge`); remove the provisional branches; run tests

**Checkpoint**: all user stories pass; 29 examples + details + edge cases + not covered + sample households green

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: qualità, documentazione e verifica finale

- [X] T025 [P] Verify constitution II isolation: `packages/fees/package.json` has no `dependencies`, and no file in `packages/fees/src/` imports anything outside `packages/fees/src/` (e.g. `grep -rE "from '(@angular|firebase|node:)" packages/fees/src` returns nothing)
- [X] T026 [P] Write `packages/fees/README.md` (Italian, short): purpose, link to `contracts/fees-api.md` and `docs/dominio/regole-quote.md`, how to run tests, rule "le quote si cambiano nel listino, non nel codice"
- [X] T027 Run every check of `specs/002-calcolo-quote-famiglia/quickstart.md`, including the manual regression (change case 18 total in `docs/dominio/regole-quote.md` → `examples-sync` fails → restore)
- [X] T028 Update `docs/roadmap.md`: 002 status → ✅ fatto
- [ ] T029 Open the pull request for branch `002-calcolo-quote-famiglia` with a table "principio → come è rispettato" for constitution principles I–V and the quality gates (tests green, `strict` typecheck clean, roadmap updated), as required by the constitution "Flusso di sviluppo e controlli di qualità"

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup — BLOCKS all user stories
- **US1 (Phase 3)**: depends on Foundational
- **US2 (Phase 4)**: depends on Foundational; edits the same file as US1 (`household-fee.ts`) → run after US1
- **US3 (Phase 5)**: depends on Foundational; edits `household-fee.ts` → run after US2
- **Polish (Phase 6)**: after all stories; T029 (pull request) is the last task, after T025–T028

### Within Each Phase

- T001 → T002/T003/T004 (parallel) → T005
- T006 → T007, T008, T010, T011 (parallel) → T009 (after T008) → T012 → T013 → T014
- Tests (T015–T017, T020, T022–T023) are written and seen failing before T018, T021, T024

### Parallel Opportunities

- Setup: T002, T003, T004
- Foundational: T007, T008, T010, T011 (different files)
- US1 tests: T015, T016, T017
- US3 tests: T022, T023
- Polish: T025, T026

---

## Parallel Example: User Story 1

```bash
# Write the three US1 test files together, then confirm they fail:
Task: "examples.test.ts — cases 1–24 and 29 in packages/fees/tests/examples.test.ts"
Task: "US1 acceptance details in packages/fees/tests/us1-details.test.ts"
Task: "edge cases in packages/fees/tests/edge-cases.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup → Phase 2 Foundational
2. Phase 3 US1 → **STOP and VALIDATE**: 25 examples (1–24, 29) green — covers 58 singles, 28 nuclei da 2, 12 da 3 of the real 2026 data

### Incremental Delivery

1. + US2 → the 2 real nuclei da 4 calculated (examples 25–28)
2. + US3 → real nucleus da 6 and child under 6 flagged instead of provisionally rejected
3. Polish → quickstart validated, roadmap updated, pull request opened

---

## Notes

- [P] tasks = different files, no dependencies
- Commit after each task or logical group, on branch `002-calcolo-quote-famiglia`
- Never put real member data in fixtures (constitution III); only the fake data of `docs/dominio/excel-esempio/`
- If a test disagrees with `docs/dominio/regole-quote.md`, the document wins: stop and ask, do not "fix" the expectation
