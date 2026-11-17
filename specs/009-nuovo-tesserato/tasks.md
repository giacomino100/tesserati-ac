---

description: "Task list for feature 009 – Nuovo tesserato"
---

# Tasks: Nuovo tesserato

**Input**: Design documents from `/specs/009-nuovo-tesserato/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (new-member-api.md, firestore-new-member.md, app-routes.md), quickstart.md

**Tests**: OBBLIGATORI — constitution III (regole di `persons` e `adhesions` cambiate: test sull'emulatore) e pratica
del progetto (logica pura testata prima del codice).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Solo dati finti e nomi inventati. Mai nomi nei log. Persone esistenti mai modificate.

---

## Phase 1: Setup

- [ ] T001 Verify the 008 baseline is green on this branch (`npm run typecheck`, `npm test`, `npm run test:rules`, `npm run test:integration -w web`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: origine "nuovo" ovunque si leggono le adesioni.

- [ ] T002 [P] Add `'nuovo'` to `YearMember.origin` in `packages/families/src/types.ts`; in `renewalView` (`packages/families/src/renewals.ts`) treat `origin` `'nuovo'` like an import for `renewed` (not undoable there) and keep the tests green
- [ ] T003 Map `origin === 'nuovo'` in `yearMembers` of `apps/web/src/app/famiglie/firestore-families-backend.ts`; `memberYears()` in `apps/web/src/app/core/member-years.ts` and `FirestoreScheduleUsage.isInUse` in `apps/web/src/app/listini/schedule-usage.ts` use `where('origin', 'in', ['riconferma', 'nuovo'])`

**Checkpoint**: tutti i test esistenti verdi

---

## Phase 3: User Story 1 - Iscrivere una persona nuova (Priority: P1) 🎯 MVP

**Goal**: modulo da Tesserati e Riconferme; persona nuova + adesione "nuovo" in una transazione.

**Independent Test**: BIANCO LUCA 10/05/2019 nel 2026/27 → 38 tesserati, ACR 7 anni, senza famiglia, nucleo da 1 in Quote.

### Tests for User Story 1 (write first, must fail)

- [ ] T004 [P] [US1] Write `packages/import/tests/new-member.test.ts` N1–N6, N12 (contracts/new-member-api.md): cleaning and uppercase with the same `identityKey` as the import; errors "Inserisci il cognome.", "Inserisci il nome.", "Inserisci la data di nascita.", "Data di nascita non valida." (nonexistent date, after the association year, more than 120 years before), "Il codice fiscale ha 16 lettere e numeri."; empty sex/tax code absent; `matchNewMember` → `new` for BIANCO LUCA against the fake files archive
- [ ] T005 [P] [US1] Extend `firebase/tests/rules.test.ts` with section "M – nuovo tesserato" M1, M2, M4, M5 (contracts/firestore-new-member.md): person `{lastName, firstName, birthDate, identityKey, sex?, taxCode?, createdInYear, createdAt, createdBy}` + adhesion `{personId, associationYear, origin:'nuovo', list, sector, addedAt, addedBy}` in one batch accepted; person without its adhesion denied; without fee schedule denied; second adhesion of the year denied; extra field (`address`), incoherent `sector`, foreign `addedAt`/`addedBy`/`createdBy` denied; unauthorized denied
- [ ] T006 [P] [US1] Write `apps/web/src/app/nuovo-tesserato/new-member.service.spec.ts` and a form spec with a fake backend (`apps/web/src/app/nuovo-tesserato/testing.ts`): "7 anni · ACR", under-min-age warning, missing schedule "Manca il listino 2027/28. Crealo nella sezione Listini." (Iscrivi disabled), field errors, success "Iscrizione salvata: BIANCO LUCA nel 2026/27.", failure "Impossibile salvare. Controlla la connessione e riprova. Non è stato salvato nulla."; Tesserati page shows the "Nuovo tesserato" button

### Implementation for User Story 1

- [ ] T007 [US1] Implement `validateNewMember` and `matchNewMember` (case `new` and `existing` by identity/tax code) in `packages/import/src/new-member.ts` with types in `packages/import/src/types.ts`; export from `packages/import/src/index.ts`
- [ ] T008 [US1] Add rules to `firebase/firestore.rules`: `persons` create (manual form, `existsAfter` of its `origin:'nuovo'` adhesion for `createdInYear`) and `adhesions` create (origin `nuovo`: fee schedule exists, person exists before or after, `!exists` previous-year adhesion, `addedAt == request.time`, `addedBy == ownEmail()`)
- [ ] T009 [US1] Create `apps/web/src/app/nuovo-tesserato/new-member-backend.ts` (interface `NewMemberBackend { context(year); add(entry, email) }`, token `NEW_MEMBER_BACKEND`, `AlreadyEnrolledError`, `RenewableError`) and `firestore-new-member-backend.ts` (`context`: archive with last adhesion, ids with adhesion in the year and the year before, fee schedule; `add`: one `runTransaction`, research R5)
- [ ] T010 [US1] Implement `apps/web/src/app/nuovo-tesserato/new-member.service.ts` (signals: fields, errors, age/list via `ageFor`/`bandForAge`/`listForBand`, match, save) and the standalone form `apps/web/src/app/nuovo-tesserato/new-member-form.ts` (OnPush, Material, 360 px; output `saved`)
- [ ] T011 [US1] Add the "Nuovo tesserato" button + form to `apps/web/src/app/tesserati/pages/members/members-page.ts` (reload after save) and to `apps/web/src/app/riconferme/pages/renewals/renewals-page.ts`; provider of `NEW_MEMBER_BACKEND` in `apps/web/src/app/app.config.ts`

**Checkpoint**: US1 visibile e testata

---

## Phase 4: User Story 2 - Non duplicare chi è già in archivio (Priority: P1)

**Goal**: persona esistente riusata, simili da decidere, rimando a Riconferme, già iscritta.

**Independent Test**: ROSSI MARIO 12/03/1965 nel 2027/28 → "Ha un'adesione nel 2026/27: usa Riconferme."; 21/03/1965 → possibile doppione.

### Tests for User Story 2 (write first, must fail)

- [ ] T012 [P] [US2] Extend `packages/import/tests/new-member.test.ts` N7–N10: same key with last adhesion 2023 → `existing` (`identity`); same tax code with another name → `existing` (`taxCode`); ROSSI MARIO 1965-03-21 vs 1965-03-12 → `similar`; previous-year adhesion → `renewable`; adhesion in the year → `alreadyInYear`; `resolveSimilar` applies the same year checks
- [ ] T013 [P] [US2] Extend `rules.test.ts` M3 (existing person: new adhesion without previous-year adhesion accepted, with previous-year adhesion denied) and write `apps/web/src/app/nuovo-tesserato/firestore-new-member-backend.emulator.test.ts` E1–E3 (add to the `test:integration` chain in `apps/web/package.json`)
- [ ] T014 [P] [US2] Extend the service/form specs: texts of contracts/app-routes.md ("Già in archivio: ultima adesione nel 2023/24. Verrà usata questa persona.", "Già in archivio con questo codice fiscale: …", "Possibile doppione: …" with "Stessa persona" / "Persona diversa" and Iscrivi disabled until chosen, "Ha un'adesione nel 2025/26: usa Riconferme." with link, "Ha già un'adesione nel 2026/27."); concurrency → "Ha già un'adesione nel 2026/27."

### Implementation for User Story 2

- [ ] T015 [US2] Complete `matchNewMember` (`similar` via `findCandidates`, `renewable`, `alreadyInYear`) and `resolveSimilar` in `packages/import/src/new-member.ts`
- [ ] T016 [US2] Add match outcomes, the similar choice and the error mapping (`AlreadyEnrolledError`, `RenewableError`) to `new-member.service.ts` and `new-member-form.ts`

**Checkpoint**: US1 + US2 = prodotto minimo

---

## Phase 5: User Story 3 - Annullare, import dopo, testo di Quote (Priority: P2)

**Goal**: sezione "Nuovi tesserati" con "Annulla iscrizione"; import che salta gli inseriti a mano; testo di Quote.

**Independent Test**: annullare BIANCO LUCA → 37 tesserati; import dello stesso anno → riga "già presente nell'anno (inserita a mano)"; Quote 2025/26 → "Nessun listino 2025/26: …".

### Tests for User Story 3 (write first, must fail)

- [ ] T017 [P] [US3] Extend `rules.test.ts` M6 (delete of an `origin:'nuovo'` adhesion without membership accepted, with membership denied, person delete denied) and M7 (query `origin in [...]` allowed); extend the renewals emulator test or the new-member one with E4 (`memberYears()` with only new members; `undo` of a new adhesion)
- [ ] T018 [P] [US3] Write N11 in `packages/import/tests/plan-import.test.ts` (`manualIds` → `alreadyRenewed` / `alreadyAdded`) and the import service spec for "già presente nell'anno (inserita a mano)"
- [ ] T019 [P] [US3] Extend `apps/web/src/app/riconferme/renewals.service.spec.ts` / `renewals-page.spec.ts`: proposed years include years with members and the year after (research R6); section "Nuovi tesserati del 2026/27" with "Annulla iscrizione" (dialog "Annullare l'iscrizione di BIANCO LUCA?", saved-fee warning, "Iscrizione annullata."), blocked in family; extend `apps/web/src/app/quote/fees.service.spec.ts`: year before the first schedule → "Nessun listino 2025/26: le quote si calcolano solo negli anni con un listino.", other missing years unchanged

### Implementation for User Story 3

- [ ] T020 [US3] Extend `delete` of `adhesions` in `firebase/firestore.rules` to `origin in ['riconferma', 'nuovo']`
- [ ] T021 [US3] Replace `renewedIds` with `manualIds` (`Map<personId, 'riconferma' | 'nuovo'>`) in `packages/import/src/plan-import.ts` (+ `SkipReason` `alreadyAdded` in `types.ts`), `apps/web/src/app/importa/import-backend.ts`, `firestore-import-backend.ts`, `testing.ts`, `import.service.ts`; message "già presente nell'anno (inserita a mano)" in `messages.ts`
- [ ] T022 [US3] Renewals: proposed years = years with members ∪ year after each; section "Nuovi tesserati del {anno}" (members with `origin:'nuovo'`) with undo reusing `undo`/`hasSavedFee` in `apps/web/src/app/riconferme/renewals.service.ts` and `renewals-page.ts`
- [ ] T023 [US3] Quote: read schedule years with `FEE_SCHEDULE_BACKEND.list()` in `apps/web/src/app/quote/fees.service.ts` and use the new text for a year before the first schedule

**Checkpoint**: tutte le storie; tutti i test verdi

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T024 [P] Update `packages/import/README.md` (new member API, `manualIds`) and `packages/families/README.md` (origin `nuovo`)
- [ ] T025 [P] Privacy check: no `console.*`, no names in logs in `apps/web/src/app/nuovo-tesserato` and the new package code; persons only with the admitted fields
- [ ] T026 Run full suite: `npm run typecheck`, `npm test`, `npm run test:rules`, `npm run test:integration -w web`, `npm run build -w web`
- [ ] T027 [P] Update `docs/roadmap.md` (009 🚧, ✅ when released) and `CLAUDE.md`
- [ ] T028 Manual scenarios M1–M7 of `specs/009-nuovo-tesserato/quickstart.md`
- [ ] T029 Release only with all tests green and the user's OK: `npx firebase deploy --only firestore:rules,hosting --project tesseramento-ac`

---

## Dependencies & Execution Order

- Setup → Foundational → US1 → US2 → US3 → Polish
- Same file in sequence: `new-member.ts` T007 → T015; `new-member.service.ts`/`new-member-form.ts` T010 → T016; `firestore.rules` T008 → T020; `rules.test.ts` T005 → T013 → T017; `renewals.service.ts`/`renewals-page.ts` T011 → T022

### Parallel Opportunities

- T002 with T003 (different files); US1 tests T004–T006; US2 tests T012–T014; US3 tests T017–T019; Polish T024, T025, T027

---

## Parallel Example: User Story 1

```bash
Task: "T004 new-member.test.ts (validazione, BIANCO LUCA nuovo)"
Task: "T005 rules M1, M2, M4, M5"
Task: "T006 new member service/form specs"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Phase 1 + 2
2. Phase 3: iscrivere una persona nuova
3. Phase 4: nessun doppione
4. **STOP and VALIDATE**: BIANCO LUCA iscritto; ROSSI MARIO rimandato o da decidere

### Incremental Delivery

- US3 (annulla, import dopo, testo di Quote) completa la specifica; rilascio di regole + hosting dopo i test verdi e l'ok.
