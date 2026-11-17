---

description: "Task list for feature 003 – Listino per anno"
---

# Tasks: Listino per anno

**Input**: Design documents from `/specs/003-listino-per-anno/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (firestore-fee-schedules.md, fees-api-additions.md, app-routes.md), quickstart.md

**Tests**: OBBLIGATORI — constitution, principio II (funzioni pure di `packages/fees`) e principio III (le regole di questa
specifica contengono logica: test sull'emulatore prima del rilascio). I test si scrivono prima dell'implementazione e devono
fallire prima di passare.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Percorsi relativi alla radice del repository. Solo dati finti: importi del PDF ed email `*@example.org`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: prerequisiti dell'ambiente e dipendenze di workspace; nessuna libreria nuova

- [X] T001 Verify a JDK 21 is installed (`java -version`); if missing, install it and note it in `specs/003-listino-per-anno/quickstart.md` prerequisites — required to run `npm run test:rules` (constitution III: rules cannot be released without these tests)
- [X] T002 [P] Add `"@tesseramento/fees": "*"` to `devDependencies` in `firebase/package.json` (only `seed.test.ts` uses it), run `npm install` at repo root, and make sure `firebase/tsconfig.json` can import it
- [X] T003 [P] In `firebase/package.json` add a `"test"` script that runs only `vitest run tests/seed.test.ts` (no emulator needed, so root `npm test` and `npm test -w @tesseramento/rules` work without Firestore); keep `test:rules` (emulator + all of `tests/**/*.test.ts`) for the rules; fix row 6 of `specs/003-listino-per-anno/quickstart.md` accordingly

**Checkpoint**: `npm run typecheck` still green; `java -version` works

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: logica pura degli importi e della bozza (principio II), backend astratto, mapper e seed. Tutte le storie ne dipendono.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests first (must FAIL before implementation)

- [X] T004 [P] Write `packages/fees/tests/money.test.ts`: guarantees P1 and P2 of `contracts/fees-api-additions.md` — `parseEuros` accepts "26,5", "26.50", "26" (→ 2650, 2650, 2600); rejects "" (`required`), "abc" (`notNumber`), "26,555" (`tooManyDecimals`), "0" and "-3" (`notPositive`), "1.234,50" (thousands separators → `notNumber`); `parseEuros(formatEuros(n))` returns `n` for sample integers; `formatEuros(2600)` is "26,00"
- [X] T005 [P] Write `packages/fees/tests/schedule-draft.test.ts`: guarantees P3–P6 — `draftToSchedule` returns ALL field issues together (never rounds "26,555"), keeps `associationYear`/`label`/`minAge`/`maxHouseholdSize` and band age ranges from `base` (P4), flags `discountedAboveFull` and `acrPackage` ≤ 0; `validateFeeSchedule(SCHEDULE_2026_27)` is empty and flags discounted > full and package ≤ 0 (P5); `labelFor(2027)` is "2027/28", `labelFor(2099)` is "2099/00"; `nextAssociationYear([2026])` is 2027 and `[2026, 2027]` is 2028, `[]` throws; `copyForNextYear` does not mutate input, sets year+1 and new label, copies quotas and fixed rules (P6); `scheduleToDraft` ↔ `draftToSchedule` round trip
- [X] T006 [P] Write `packages/fees/tests/schedule-roundtrip.test.ts`: guarantee P7 / SC-005 — serialize `SCHEDULE_2026_27` to JSON and parse back (the storage shape, without `updatedAt`/`updatedBy`), then run every example already used by `packages/fees/tests/examples.test.ts` (reuse its fixtures in `packages/fees/tests/fixtures`) and assert the same totals

### Implementation

- [X] T007 [P] Implement `packages/fees/src/money.ts`: `parseEuros(text)`, `MoneyErrorCode`, `formatEuros(cents)` per `contracts/fees-api-additions.md`; integer arithmetic on the digit string, no floats, no rounding, no thousands separators
- [X] T008 Implement `packages/fees/src/schedule-draft.ts` (depends on T007): `ScheduleDraft`, `DraftField`, `FieldIssue`, `FieldIssueCode`, `draftToSchedule`, `scheduleToDraft`, `validateFeeSchedule`, `labelFor`, `nextAssociationYear`, `copyForNextYear`; no quota or percentage hard-coded; pure, no Angular/Firebase
- [X] T009 Export the new API from `packages/fees/src/index.ts` (additive only; existing exports unchanged) and run `npm test -w @tesseramento/fees` + `npm run typecheck -w @tesseramento/fees` — the 126 earlier tests plus T004–T006 must pass
- [X] T010 [P] Create `firebase/seed/fee-schedule-2026.json` with the document shape of `data-model.md` for 2026/27 (`associationYear` 2026, `label` "2026/27", `minAge` 6, `maxHouseholdSize` 4, `acrPackageCents` 2500, bands acr 6–14 1500/1200, giovanissimi 15–18 1600/1300, giovani 19–29 2200/1800, adulti 30+ 2600/2100 without `maxAge`); no `updatedAt`/`updatedBy` (the script adds them)
- [X] T011 [P] Write `firebase/tests/seed.test.ts`: the seed JSON deep-equals `SCHEDULE_2026_27` (SC-002, F10); runs without the emulator (run by the `test` script of T003)
- [X] T012 Create `firebase/scripts/seed-fee-schedule.cjs`: writes `feeSchedules/2026` from the seed JSON with `updatedAt` = server timestamp and `updatedBy` = the lowercase email passed with the required argument `--email <address>` (the Firebase CLI does not expose its account email; with `--emulator` use e.g. `seed@example.org`), using the already-authenticated Firebase CLI credentials (same technique as for `allowedEmails`); supports `--emulator` (host from `FIRESTORE_EMULATOR_HOST`, project `demo-tesseramento`); stops with a message if the document already exists; never logs personal data other than that it ran. Update the seed commands in `quickstart.md` and T044/T045 to include `--email`
- [X] T013 [P] Create `apps/web/src/app/listini/fee-schedule-backend.ts`: `FeeScheduleBackend` interface (`list()`, `get(year)`, `create(schedule, email)`, `update(schedule, email, openedAt, overwrite)`) with an `InjectionToken`, a `StoredSchedule` type (`FeeSchedule` + `updatedAt: Date` + `updatedBy: string`) and a `ScheduleConflictError`; follows the pattern of `core/auth-backend.ts`
- [X] T014 [P] Create `apps/web/src/app/listini/schedule-mapper.ts` + `schedule-mapper.spec.ts`: Firestore document ↔ `StoredSchedule` (timestamps to `Date`, `maxAge` absent for `adulti`; the mapper itself rejects documents with unexpected extra fields, while `validateFeeSchedule` checks the values)
- [X] T015 [P] Create `apps/web/src/app/listini/schedule-usage.ts`: `ScheduleUsage` interface with `isInUse(year): Promise<boolean>` + token and default implementation always returning `false` (research R7; replaced by spec 004+)

**Checkpoint**: Foundation ready — `npm test -w @tesseramento/fees` green, `seed.test.ts` green, typecheck green

---

## Phase 3: User Story 1 - Vedere i listini degli anni (Priority: P1) 🎯 MVP

**Goal**: un utente autorizzato apre "Listini", vede 2026/27 e le sue quote, le regole del PDF e l'ultima modifica; i non autorizzati non leggono nulla.

**Independent Test**: dopo l'accesso, "Listini" mostra 2026/27 e ogni importo coincide con `regole-quote.md` §1 (M1, SC-002); le regole negano la lettura ai non autorizzati (F1, F2, F10).

### Tests for User Story 1 ⚠️ (write first, must fail)

- [X] T016 [US1] Extend `firebase/tests/rules.test.ts` with a `feeSchedules` read section: F1 (no access / account not in `allowedEmails` / signed out → no get, no list, no write), F2 (authorized user reads one schedule and lists; a session with `auth_time` older than 7 days cannot), F10 (a schedule seeded with the contents of `fee-schedule-2026.json` is readable and equals `SCHEDULE_2026_27`); seed through `withSecurityRulesDisabled`; add a `delete` denied for everyone (F8, FR-012)
- [X] T017 [P] [US1] Write `apps/web/src/app/listini/fee-schedule.service.spec.ts` (list part): with a fake `FeeScheduleBackend`, `schedules()` is ordered most recent first, `open(2026)` exposes the stored schedule and last-modified data, a backend error sets an error state and exposes no data
- [X] T018 [P] [US1] Write specs for the pages: `apps/web/src/app/listini/pages/list/list.spec.ts` (rows "2026/27" with date and email; empty state "Nessun listino. Contatta chi gestisce il progetto." with the "Nuovo listino" button hidden/disabled when the list is empty, because `nextAssociationYear([])` throws; "Nuovo listino" button otherwise) and `apps/web/src/app/listini/pages/detail/detail.spec.ts` (table ACR 15,00 € / 12,00 €, Giovanissimi 16,00 € / 13,00 €, Giovani 22,00 € / 18,00 €, Adulti 26,00 € / 21,00 €, "Pacchetto 2 ACR" 25,00 €, ages 6–14, 15–18, 19–29, 30 e oltre, box "Regole del PDF (non modificabili)" with età minima 6 and massimo 4, "Ultima modifica: <data>, <email>"; no horizontal overflow classes)

### Implementation for User Story 1

- [X] T019 [US1] Add to `firebase/firestore.rules`, before the final deny-all, `match /feeSchedules/{yearId}` with `allow get, list: if isAllowed();` and `allow delete: if false;` (create/update stay denied for now; US2/US3 add them) — run `npm run test:rules`
- [X] T020 [P] [US1] Create `apps/web/src/app/listini/firestore-fee-schedule-backend.ts`: Firestore implementation of `list()` and `get()` using the mapper (read-only for now); provide it in `apps/web/src/app/app.config.ts`
- [X] T021 [US1] Create `apps/web/src/app/listini/fee-schedule.service.ts` (signals): `schedules`, `open(year)`, loading/error state; no personal data in logs
- [X] T022 [P] [US1] Create list page `apps/web/src/app/listini/pages/list/list.ts` (Material list/cards, texts per `contracts/app-routes.md`, euro values via `formatEuros` with " €")
- [X] T023 [P] [US1] Create detail page `apps/web/src/app/listini/pages/detail/detail.ts` (read-only table, rules box, last-modified line, "Modifica" button hidden until US3 wires it; layout fluid at 360 px)
- [X] T024 [US1] Add routes `/listini` and `/listini/:anno` to `apps/web/src/app/app.routes.ts` (both `requireState('allowed')`, lazy `loadComponent`) and a "Listini" entry on `apps/web/src/app/pages/home/home.ts` (+ update `home.spec.ts`)

**Checkpoint**: US1 fully functional and testable independently (after running T012 against the emulator or production)

---

## Phase 4: User Story 2 - Creare il listino di un nuovo anno (Priority: P1)

**Goal**: creare il listino dell'anno successivo al più recente, copiando e correggendo le quote; il 2026/27 non cambia.

**Independent Test**: si crea il 2027 copiando il 2026/27, si cambia la quota Adulti a 27,00 €, si salva e si riapre; il 2026/27 mostra ancora 26,00 € (M2, M3, M4, SC-004).

### Tests for User Story 2 ⚠️ (write first, must fail)

- [X] T025 [US2] Extend `firebase/tests/rules.test.ts` with creation guards: F3 (create `Y` with `Y-1` present and `Y` absent, valid values, `updatedBy` = own lowercase email, `updatedAt` = `request.time` → allowed), F4 (skipped year 2028 without 2027, already existing year, 2025, non 4-digit ID → denied), F5 on create (zero, negative, non-integer, discounted > full, package ≤ 0, missing/extra fields, bands in another order, `maxAge` present on `adulti` or missing on another band → denied), F6 on create (different `label`, `minAge`, `maxHouseholdSize`, band `minAge`/`maxAge` from `Y-1` → denied), F7 creation half (fake email, old `updatedAt` → denied), F9 (values of all other schedules identical before and after)
- [X] T026 [P] [US2] Extend `fee-schedule.service.spec.ts` (create part): `proposedYear()` is 2027 with only 2026, 2028 once 2027 exists; `startNew()` copies latest via `copyForNextYear`; `create(draft)` calls the backend only if `draftToSchedule` has no issues, returns all field issues together otherwise, and never touches other years; a backend failure (including offline: the fake backend rejects) leaves state unchanged and exposes "Impossibile salvare. Controlla la connessione e riprova."; with no schedules `proposedYear()` signals "no base schedule" instead of throwing
- [X] T027 [P] [US2] Write `apps/web/src/app/listini/schedule-form/schedule-form.spec.ts`: one field per quota (8 band fields + package) with "€" suffix, no fields for ages/min age/max household; messages from `contracts/app-routes.md` next to the right field ("Inserisci un importo.", "Inserisci un importo valido, per esempio 26,00.", "Usa al massimo due decimali.", "L'importo deve essere maggiore di zero.", "La quota con sconto non può superare la quota piena."); comma and point accepted; all errors shown together; "Salva" blocked on errors
- [X] T028 [P] [US2] Write `apps/web/src/app/listini/pages/new/new.spec.ts`: year shown read-only and equal to the proposed year, values prefilled from the latest schedule, saving navigates to the detail page with values re-read from the backend, error "Il listino per questo anno non può essere creato. Crea prima gli anni precedenti." on rejection

### Implementation for User Story 2

- [X] T029 [US2] Add to `firebase/firestore.rules` the `create` condition for `feeSchedules/{yearId}` per `contracts/firestore-fee-schedules.md` (conditions 1–5): 4-digit ID, `associationYear == int(yearId)`, `exists` of `Y-1` and `!exists` of `Y`, exact key set via `keys().hasOnly(...)`/`hasAll(...)`, integer amounts > 0, `discountedCents <= fullCents`, four bands checked one by one in order (`maxAge` absent for `adulti`, present as an integer for the other three), fixed fields equal to `Y-1` (`get`), `updatedBy == ownEmail()`, `updatedAt == request.time`; helper functions for band validation; stay within the 10-document-access limit (about 4 used: `isAllowed` + `exists`/`get` of `Y-1` + `exists` of `Y`) — run `npm run test:rules` until T025 passes
- [X] T030 [US2] Implement `create()` in `apps/web/src/app/listini/firestore-fee-schedule-backend.ts` with `runTransaction` (NOT a bare `setDoc`: offline, `setDoc` queues the write and never rejects, so "Impossibile salvare…" would not appear); write with `serverTimestamp()` and lowercase email, no partial writes and the creation methods in `fee-schedule.service.ts` (`proposedYear`, `startNew`, `create`)
- [X] T031 [P] [US2] Create the shared form component `apps/web/src/app/listini/schedule-form/schedule-form.ts` (reactive forms, text inputs with numeric keyboard `inputmode="decimal"`, errors per field from `FieldIssue`, read-only box with the fixed PDF rules, "Salva"/"Annulla" buttons, fluid layout at 360 px)
- [X] T032 [US2] Create `apps/web/src/app/listini/pages/new/new.ts` and route `/listini/nuovo` in `apps/web/src/app/app.routes.ts` (declared BEFORE `/listini/:anno`, `requireState('allowed')`); the "Nuovo listino" button of the list page links here

**Checkpoint**: US1 and US2 both work; creating 2027 leaves 2026/27 unchanged

---

## Phase 5: User Story 3 - Correggere un listino esistente (Priority: P2)

**Goal**: modificare le quote di un listino salvato, con avviso se l'anno ha adesioni, gestione della collisione e avviso di uscita.

**Independent Test**: si modifica una quota del 2027, si salva e si verifica il nuovo valore con data ed email aggiornate (M5); in due schede compare l'avviso di collisione (M6); l'avviso adesioni è coperto da un `ScheduleUsage` finto (M10).

### Tests for User Story 3 ⚠️ (write first, must fail)

- [X] T033 [US3] Extend `firebase/tests/rules.test.ts` with update guards: F5 on update (invalid values, extra/missing fields → denied), F6 on update (changing `label`, `minAge`, `maxHouseholdSize`, `associationYear`, band ages/names/order → denied), F7 (quotas only with valid values and own `updatedBy`/`request.time` → allowed; fake email or stale `updatedAt` → denied), F9 (other years unchanged after an update), F8 again (delete still denied after the update rule exists)
- [X] T034 [P] [US3] Extend `fee-schedule.service.spec.ts` (update part): `update(draft)` saves valid quotas only; a changed `updatedAt` since `openedAt` yields a conflict state without writing; `overwrite()` saves after explicit choice; `reload()` ("Annulla e ricarica") re-reads the updated schedule; with `ScheduleUsage.isInUse` fake `true` the service requires confirmation before saving, with `false` it does not; other years untouched
- [X] T035 [P] [US3] Write `apps/web/src/app/listini/pages/detail/detail-edit.spec.ts`: "Modifica" switches to the form with the schedule's values, "Salva" returns to the detail with updated values and date/email; conflict dialog text "Il listino è stato modificato da qualcun altro." with buttons "Sovrascrivi" / "Annulla e ricarica"; in-use dialog "Le quote già calcolate per questo anno non cambiano finché non vengono ricalcolate." with "Conferma" / "Annulla"; unsaved-changes guard "Hai modifiche non salvate. Vuoi uscire senza salvare?" (route `canDeactivate` that asks the component's `hasUnsavedChanges()`, also when leaving `/listini/:anno` while in edit mode) and `beforeunload` registered only while the form is dirty

### Implementation for User Story 3

- [X] T036 [US3] Add to `firebase/firestore.rules` the `update` condition for `feeSchedules/{yearId}` (conditions 1–4 of the contract): `associationYear` unchanged, same shape and value checks as create (reuse the helper functions of T029), fixed fields equal to `resource.data`, `updatedBy == ownEmail()`, `updatedAt == request.time`; keep `delete: if false` — run `npm run test:rules` until T033 passes
- [X] T037 [US3] Implement `update()` in `apps/web/src/app/listini/firestore-fee-schedule-backend.ts` with `runTransaction`: re-read the document, compare `updatedAt` with `openedAt`, throw `ScheduleConflictError` unless `overwrite` is true, write with `serverTimestamp()`; no partial writes on network failure
- [X] T038 [US3] Add the update flow to `apps/web/src/app/listini/fee-schedule.service.ts` (`edit`, `update`, `overwrite`, `reload`, conflict and confirmation states using `ScheduleUsage`) and provide `ScheduleUsage` in `apps/web/src/app/app.config.ts`
- [X] T039 [P] [US3] Create `apps/web/src/app/listini/unsaved-changes.guard.ts` (`canDeactivate` that calls the component's `hasUnsavedChanges()`, with the Italian message + `beforeunload` listener helper) and use it on `/listini/nuovo` and `/listini/:anno` (edit mode lives on the same route, see `contracts/app-routes.md`)
- [X] T040 [US3] Wire edit mode into `apps/web/src/app/listini/pages/detail/detail.ts` (show "Modifica", reuse `schedule-form`, conflict and in-use dialogs with Material) and update `/listini/:anno` accordingly in `apps/web/src/app/app.routes.ts`

**Checkpoint**: all three stories work independently

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: documentazione, verifica complessiva e rilascio controllato

- [X] T041 [P] Update `packages/fees/README.md` with the new functions (money, draft, labels, `copyForNextYear`) and the additive contract
- [X] T042 [P] Update `docs/roadmap.md` (003 status), `CLAUDE.md` ("Stato attuale": 003 done, rules tests and seed instructions) and, if relevant, `docs/dominio/` notes; keep texts in Italian
- [X] T043 Run the full automatic checks of `quickstart.md`: `npm install`, `npm run typecheck`, `npm test -w @tesseramento/fees`, `npm test -w web`, `npm run test:rules` (A1…A8 + F1…F10, needs the JDK), `seed.test.ts`; fix any failure before continuing
- [ ] T044 Run the manual scenarios M1–M9 of `quickstart.md` on the emulators (`npm run emulators`, seed with `node firebase/scripts/seed-fee-schedule.cjs --emulator --email seed@example.org`, `npm start`), including a 360 px viewport check (SC-007, FR-015 on phone) and a stopwatch timing of creating a new schedule by copying and changing all quotas, under 3 minutes (SC-001); M10 stays covered by the fake `ScheduleUsage` test
- [X] T045 Release, only with all tests green (constitution III): `npx firebase deploy --only firestore:rules,hosting --project tesseramento-ac`, then run `node firebase/scripts/seed-fee-schedule.cjs --email <maintainer email>` ONCE against production and verify M1 on https://tesseramento-ac.web.app; ask the user for confirmation before deploying or seeding production
- [X] T046 Write the PR description listing the constitution principles that apply (I–V) and how this feature respects each (required by the constitution's development flow); confirm `docs/roadmap.md` is updated (T042)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies; T001 (JDK) must be done before any `test:rules` task (T016, T019, T025, T029, T033, T036, T043)
- **Foundational (Phase 2)**: depends on Setup — BLOCKS all user stories
- **US1 (P1)**: after Foundational; no dependency on other stories — MVP
- **US2 (P1)**: after Foundational; uses US1 service and routes files (`fee-schedule.service.ts`, `firestore-fee-schedule-backend.ts`, `app.routes.ts`) so in practice follows US1; testable independently once a schedule exists
- **US3 (P2)**: after US2 for the shared `schedule-form` and the rules helper functions; edits the same service/backend/rules files
- **Polish**: after the desired stories are complete

### Within Each Story

- Tests first and failing, then rules / backend, then service, then pages and routes
- `firebase/firestore.rules`, `firebase/tests/rules.test.ts`, `fee-schedule.service.ts` and `firestore-fee-schedule-backend.ts` are touched by several stories: do those tasks sequentially, not in parallel

### Parallel Opportunities

- Foundational: T004, T005, T006 (tests) together; then T007 with T010, T011, T013, T014, T015
- US1: T017 and T018 together; T022 and T023 together after T021
- US2: T026, T027, T028 together; T031 in parallel with T030
- US3: T034 and T035 together; T039 in parallel with T037
- Polish: T041 and T042 together

---

## Parallel Example: Foundational tests

```bash
# Launch all pure-function tests together (they must fail first):
Task: "Write packages/fees/tests/money.test.ts (P1, P2)"
Task: "Write packages/fees/tests/schedule-draft.test.ts (P3–P6)"
Task: "Write packages/fees/tests/schedule-roundtrip.test.ts (P7)"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup (JDK first)
2. Phase 2: Foundational (pure functions, seed, backend abstractions)
3. Phase 3: US1 — read-only list and detail with the 2026/27 schedule
4. **STOP and VALIDATE**: M1 and F1/F2/F10; deploy rules + app and seed 2026 only after green tests

### Incremental Delivery

1. Setup + Foundational → pure library and seed ready
2. US1 → read the schedules (MVP)
3. US2 → create the next year (the reason for the feature)
4. US3 → corrections, collisions, in-use warning
5. Polish → docs, full checks, single controlled release

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- No quota or percentage in calculation code: the discounted fee is a value typed by the user (principle II)
- Amounts are integer cents in storage; euros with two decimals only in the UI
- Never real data in repo, tests or logs; the only stored personal data is the last editor's email (FR-016)
- Commit after each task or logical group; deploy only after green tests
