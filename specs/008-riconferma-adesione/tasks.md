---

description: "Task list for feature 008 – Riconferma adesione"
---

# Tasks: Riconferma adesione

**Input**: Design documents from `/specs/008-riconferma-adesione/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (renewals-api.md, firestore-renewals.md, app-routes.md), quickstart.md

**Tests**: OBBLIGATORI — constitution III (regole di `adhesions` cambiate: test sull'emulatore) e pratica del
progetto (logica pura testata prima del codice).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Solo dati finti. Mai nomi nei log. Le adesioni importate e quelle di altri anni non si toccano.

---

## Phase 1: Setup

- [X] T001 Verify the 010 baseline is green on this branch (`npm run typecheck`, `npm test`, `npm run test:rules`, `npm run test:integration -w web`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: elenco di un'adesione importata o riconfermata, origine dei tesserati, anni con tesserati.

- [X] T002 [P] Write tests I1 in `packages/import/tests/lists.test.ts`: `listOfAdhesion('2026-ACR', undefined)` → `ACR`; `listOfAdhesion(undefined, 'GIOVANI')` → `GIOVANI`; invalid values → `undefined`; then implement `listOfAdhesion(importId?: string, list?: string)` in `packages/import/src/lists.ts` and export it from `packages/import/src/index.ts`
- [X] T003 [P] Add to `packages/families/src/types.ts`: `YearMember.origin?: 'import' | 'riconferma'` (absent = import) and the renewal types of data-model.md (`RenewalWarning` = `listChange {from,to}` | `underMinAge {minAge}` | `invalidBirthDate`; `RenewalCandidate`, `RenewalGroup`, `RenewedMember`, `RenewalView`, `RenewalDraft`); export from `packages/families/src/index.ts`
- [X] T004 Use `listOfAdhesion(a.importId, a.list)` and set `origin` (`'riconferma'` when `a.origin === 'riconferma'`) in `yearMembers` of `apps/web/src/app/famiglie/firestore-families-backend.ts`; use `listOfAdhesion` in `yearContext` of `apps/web/src/app/importa/firestore-import-backend.ts`
- [X] T005 Create `apps/web/src/app/core/member-years.ts` with `memberYears()` = years of `importBatches` ∪ years of `adhesions` where `origin == 'riconferma'` (research R3); use it in `importedYears()` of `apps/web/src/app/famiglie/firestore-families-backend.ts` and `apps/web/src/app/tesserati/firestore-members-backend.ts`; `FirestoreScheduleUsage.isInUse` in `apps/web/src/app/listini/schedule-usage.ts` also true when the year has a reconfirmed adhesion (`limit(1)`)

**Checkpoint**: tutti i test esistenti verdi; nessun cambiamento visibile

---

## Phase 3: User Story 1 - Vedere chi può rinnovare (Priority: P1) 🎯 MVP

**Goal**: pagina "Riconferme" con gruppi per `N. Legame`, singoli, età, elenco del nuovo anno e avvisi.

**Independent Test**: dati finti 2026 + listino 2027/28 → 37 da decidere (9 gruppi + 10 singoli), cambi RINALDI e RIZZO, avviso GATTI MIA.

### Tests for User Story 1 (write first, must fail)

- [X] T006 [P] [US1] Write `packages/families/tests/renewals.test.ts` (R1–R7, R9 of contracts/renewals-api.md): read the three fake files with `@tesseramento/import` as 2026 members (helpers in `packages/families/tests/helpers.ts`), fee schedule 2027/28 built like the 2026 one (minAge 6; bands acr 6–14, giovanissimi 15–18, giovani 19–29, adulti 30+); expect 37 pending, 9 groups 900001–900009 with 27 people ordered oldest first, 10 singles by last/first name; RINALDI PIETRO 15 `GIOVANI` `listChange` ACR→GIOVANI; RIZZO VALERIA 30 `ADULTI` GIOVANI→ADULTI; GATTI MIA 5 `ACR` `underMinAge` 6 renewable; lists 14/8/15 and exactly 2 `listChange`; born after the year → `invalidBirthDate`, not renewable; members already in the new year → `renewed`; no schedule → nothing renewable
- [X] T007 [P] [US1] Write `apps/web/src/app/riconferme/renewals.service.spec.ts` and `apps/web/src/app/riconferme/pages/renewals/renewals-page.spec.ts` with a fake backend (`apps/web/src/app/riconferme/testing.ts`): proposed years (R9: `y + 1` of member years, default highest), `?anno=`, summary "Da decidere: 37 · Già iscritti nel 2027/28: 0", groups with "N. Legame 900003 · C4", row "GALLO TOMMASO · 13 anni · ACR", warnings "Passa da ACR a Giovani" and "Sotto l'età minima del listino (6 anni): quota non prevista", "Manca il listino 2027/28. Crealo nella sezione Listini.", "Nessun tesserato nel 2026/27 da riconfermare."; home has "Riconferme"

### Implementation for User Story 1

- [X] T008 [US1] Implement `listForBand` and `renewalView({ year, previous, current, memberships, schedule })` in `packages/families/src/renewals.ts` using `ageFor`/`bandForAge` of `@tesseramento/fees` (research R4, R8); export from `packages/families/src/index.ts`
- [X] T009 [US1] Create `apps/web/src/app/riconferme/renewals-backend.ts` (interface `RenewalsBackend { memberYears(); yearMembers(year); memberships(year); schedule(year); renew(drafts, year, email); undo(year, personId); hasSavedFee(year, personId) }`, token `RENEWALS_BACKEND`, `AlreadyRenewedError`, `PartialRenewalError { saved: number }`) and the fake in `apps/web/src/app/riconferme/testing.ts`
- [X] T010 [US1] Implement `apps/web/src/app/riconferme/renewals.service.ts` (signals: years, year, view via `renewalView`, texts of contracts/app-routes.md; loads in parallel with `PendingTasks`-friendly promises) and `apps/web/src/app/riconferme/pages/renewals/renewals-page.ts` (`/riconferme?anno=`, OnPush, Material, usable at 360 px)
- [X] T011 [US1] Add route `riconferme` (guard `requireState('allowed')`) to `apps/web/src/app/app.routes.ts`, provider of `RENEWALS_BACKEND` (Firestore implementation, read methods in `apps/web/src/app/riconferme/firestore-renewals-backend.ts` reusing the families backend reads) to `apps/web/src/app/app.config.ts`, link "Riconferme" in `apps/web/src/app/pages/home/home.ts` (+ `home.spec.ts`)

**Checkpoint**: US1 visibile e testata

---

## Phase 4: User Story 2 - Riconfermare chi rinnova (Priority: P1)

**Goal**: spunte (singole, "tutto il nucleo", "Seleziona tutti") e "Riconferma", a gruppi di 15.

**Independent Test**: riconfermati tutti i 37 → 2027 con 14 ACR, 8 Giovani, 15 Adulti; in Famiglie 2027 9 famiglie suggerite.

### Tests for User Story 2 (write first, must fail)

- [X] T012 [P] [US2] Extend `firebase/tests/rules.test.ts` with section "L – riconferme" (L1–L7, L10 of contracts/firestore-renewals.md): valid reconfirmation `{personId, associationYear, origin:'riconferma', list, sector, bond?, bondId?, renewedFrom, renewedAt: serverTimestamp, renewedBy}` accepted; rejected without previous-year adhesion, with `renewedFrom != associationYear - 1`, without fee schedule, as second adhesion of the year, with `sector` not matching `list` (`ACR`→`RAGAZZI`, `GIOVANI`→`GIOVANI`, `ADULTI`→`ADULTI`), invalid `list`, extra fields, `importId`, other `renewedAt`/`renewedBy`; 15 reconfirmations in one batch accepted; unauthorized user denied; query `origin == 'riconferma'` allowed
- [X] T013 [P] [US2] Write `apps/web/src/app/riconferme/firestore-renewals-backend.emulator.test.ts` (E1, E2, E4): `renew` of 37 → 37 documents with expected fields (3 transactions of ≤ 15); one already present → `AlreadyRenewedError`, nothing saved for that group; `memberYears()` includes a year with only reconfirmations; add the file to the `test:integration` chain in `apps/web/package.json`
- [X] T014 [P] [US2] Extend `renewals.service.spec.ts`, `renewals-page.spec.ts` and `packages/families/tests/renewals.test.ts` (R10 `renewalDraft`): select one, "tutto il nucleo" (partial selection = not full), "Seleziona tutti", "Riconferma (N)" disabled without selection or schedule, message "3 persone riconfermate per il 2027/28.", partial "Riconfermate 30 persone su 37. Le altre non sono state salvate: controlla la connessione e riprova.", failure "Impossibile salvare. Controlla la connessione e riprova. Non è stato salvato nulla.", concurrency "Qualcuno ha appena iscritto una di queste persone: elenco aggiornato, riprova."; extend `apps/web/src/app/famiglie/families.service.spec.ts` or its fake so reconfirmed members are suggested by copied `bondId`

### Implementation for User Story 2

- [X] T015 [US2] Add the reconfirmation branch to `create` of `match /adhesions/{adhesionId}` in `firebase/firestore.rules` (contracts/firestore-renewals.md: keys `hasOnly(['personId','associationYear','origin','list','sector','bond','bondId','renewedFrom','renewedAt','renewedBy'])`, `hasAll` without `bond`/`bondId`; `exists(adhesions/{renewedFrom}_{personId})`; `exists(feeSchedules/{anno})`; `renewedAt == request.time`; `renewedBy == ownEmail()`); import branch unchanged
- [X] T016 [US2] Implement `renewalDraft` in `packages/families/src/renewals.ts`
- [X] T017 [US2] Implement `renew` in `apps/web/src/app/riconferme/firestore-renewals-backend.ts` (groups of 15, each a `runTransaction` that reads the new-year adhesions first; `sector` from `sectorOf(list)`; `renewedFrom = year - 1`; `serverTimestamp()`; email lowercase; `PartialRenewalError` with the saved count)
- [X] T018 [US2] Add selection and renew flow to `renewals.service.ts` and `renewals-page.ts` (reload after save; messages of contracts/app-routes.md)

**Checkpoint**: US1 + US2 = prodotto minimo

---

## Phase 5: User Story 3 - Annullare e importare dopo (Priority: P2)

**Goal**: "Annulla riconferma" (con avviso sulla quota salvata) e import che salta le persone riconfermate.

**Independent Test**: annullare MORETTI CARLA → torna da decidere; import ACR 2027 → righe riconfermate saltate.

### Tests for User Story 3 (write first, must fail)

- [X] T019 [P] [US3] Extend `firebase/tests/rules.test.ts` (L8, L9): delete of a reconfirmation without `familyMemberships/{anno}_{personId}` accepted; with membership rejected; delete of an imported adhesion rejected; update of a reconfirmation rejected
- [X] T020 [P] [US3] Extend `firestore-renewals-backend.emulator.test.ts` (E3): `undo` removes the adhesion; with membership → error, nothing changed; `hasSavedFee` true when `householdFees/{anno}_p-{personId}` exists
- [X] T021 [P] [US3] Write tests I2–I3 in `packages/import/tests/plan-import.test.ts` (or the existing plan tests): 3 persons in `renewedIds` → 3 rows `alreadyRenewed`, no adhesion for them; behaviour unchanged without `renewedIds`
- [X] T022 [P] [US3] Extend `renewals.service.spec.ts` / `renewals-page.spec.ts` (R8 in `renewals.test.ts` too): renewed list "MORETTI CARLA · Adulti · riconfermata il …", imported rows "importata" without undo, in-family rows "Prima togli questa persona dalla famiglia del 2027/28.", dialog "Annullare la riconferma di MORETTI CARLA?" with the extra line "La quota salvata del suo nucleo andrà ricalcolata in Quote." only when a saved fee exists, "Riconferma annullata."; extend `apps/web/src/app/importa/import.service.spec.ts` (or page spec) for the message "già presente nell'anno (riconferma)"

### Implementation for User Story 3

- [X] T023 [US3] Add `delete` to `match /adhesions/{adhesionId}` in `firebase/firestore.rules`: `isAllowed() && resource.data.get('origin', '') == 'riconferma' && !exists(familyMemberships/$(adhesionId))`
- [X] T024 [US3] Implement `undo` and `hasSavedFee` in `firestore-renewals-backend.ts`; undo flow with confirmation in `renewals.service.ts` / `renewals-page.ts`
- [X] T025 [US3] Add `alreadyRenewed` to `SkipReason` in `packages/import/src/types.ts` and the optional `renewedIds` parameter to `planImport` in `packages/import/src/plan-import.ts`; `YearContext.renewedIds` in `apps/web/src/app/importa/import-backend.ts`, filled in `firestore-import-backend.ts` and `apps/web/src/app/importa/testing.ts`, passed by `import.service.ts`; message "già presente nell'anno (riconferma)" in `apps/web/src/app/importa/messages.ts`

**Checkpoint**: tutte le storie; tutti i test verdi

---

## Phase 5b: Correzione dell'anno dell'export (chiarimento del 2026-11-17, FR-013)

- [X] T032 Update `docs/dominio/glossario.md` ("Anno N" = (N−1)/N), `docs/dominio/excel-esempio/README.md` and `genera_esempi.py`; relabel the three fake files to "Anno 2027" (= 2026/27, ages unchanged)
- [X] T033 Tests first: `parseAssociationYear('Anno 2026')` → 2025 in `packages/import/tests/clean.test.ts`; sheet builders to "Anno 2027"; import without fee schedule allowed in `import.service.spec.ts`, `import-page.spec.ts`, `firestore-import-backend.emulator.test.ts`, rules test I6
- [X] T034 `parseAssociationYear` returns N−1 in `packages/import/src/clean.ts`; import no longer requires the fee schedule (`import.service.ts`, `firestore-import-backend.ts`, `testing.ts`, `firestore.rules` importBatches); notice "Nessun listino 2025/26: niente controlli su età e settore."
- [ ] T035 Production data already imported as 2026/27: plan and run the move to 2025/26 only with the user's explicit OK (admin access, real data never in logs or repository)

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T026 [P] Update `packages/families/README.md` (renewal API) and `packages/import/README.md` (`listOfAdhesion`, `alreadyRenewed`)
- [X] T027 [P] Privacy check: no `console.*`, no names in logs in `apps/web/src/app/riconferme` and the new package code
- [X] T028 Run full suite: `npm run typecheck`, `npm test`, `npm run test:rules`, `npm run test:integration -w web`, `npm run build -w web`
- [X] T029 [P] Update `docs/roadmap.md` (008 🚧, ✅ when released) and `CLAUDE.md`
- [ ] T030 Manual scenarios M1–M7 of `specs/008-riconferma-adesione/quickstart.md` (M1 under 3 s, M3 under 10 s)
- [ ] T031 Release only with all tests green and the user's OK: `npx firebase deploy --only firestore:rules,hosting --project tesseramento-ac`

---

## Dependencies & Execution Order

- Setup → Foundational → US1 → US2 → US3 → Polish
- Same file in sequence: `renewals.ts` T008 → T016; `renewals.service.ts`/`renewals-page.ts` T010 → T018 → T024; `firestore-renewals-backend.ts` T011 → T017 → T024; `firestore.rules` T015 → T023; `rules.test.ts` T012 → T019; emulator test T013 → T020; `firestore-families-backend.ts` T004 → T005

### Parallel Opportunities

- T002 with T003; US1 tests T006–T007; US2 tests T012–T014; US3 tests T019–T022; Polish T026, T027, T029

---

## Parallel Example: User Story 1

```bash
Task: "T006 renewals.test.ts (file finti, 37 da decidere, 14/8/15)"
Task: "T007 renewals service/page specs"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Phase 1 + 2
2. Phase 3: chi può rinnovare (sola lettura)
3. Phase 4: riconferma a gruppi
4. **STOP and VALIDATE**: 37 riconfermati, 14/8/15, famiglie suggerite nel 2027

### Incremental Delivery

- US3 (annulla, import dopo) completa la specifica; rilascio di regole + hosting dopo i test verdi e l'ok.
