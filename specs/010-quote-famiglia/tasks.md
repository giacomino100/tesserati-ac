---

description: "Task list for feature 010 – Quote nella famiglia"
---

# Tasks: Quote nella famiglia

**Input**: Design documents from `/specs/010-quote-famiglia/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (households-api.md, firestore-fees.md, app-routes.md), quickstart.md

**Tests**: OBBLIGATORI — constitution II (calcolo quote: test prima del codice, i 29 esempi via nuclei e listino come
in archivio) e III (nuova collezione: regole testate sull'emulatore).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Solo dati finti. Mai nomi nei log. Nessun importo o percentuale nel codice dell'app.

---

## Phase 1: Setup

- [X] T001 Verify the 007 baseline is green on this branch (`npm run typecheck`, `npm test`, `npm run test:rules`, `npm run test:integration -w web`)
- [X] T002 Add `"@tesseramento/fees": "*"` to `dependencies` of `packages/families/package.json` (pure package); `npm install`

---

## Phase 2: Foundational (Blocking Prerequisites)

- [X] T003 Add the types of data-model.md to `packages/families/src/types.ts` (`Household` with `key` "`f-{familyId}` | `p-{personId}`", `HouseholdsOfYear`, `HouseholdFee`, `SavedHouseholdFee` with `kind: 'calculated' | 'manual'`, `reason?: 'householdTooLarge' | 'memberUnderMinAge' | 'invalidInput'`, `FeeComparison` with `status: 'new' | 'unchanged' | 'changed' | 'removed'` and `needsManual`, `YearTotals`) and export them
- [X] T004 [P] Create `apps/web/src/app/quote/fees-backend.ts` (interface `HouseholdFeesBackend`: `saved(year): Promise<SavedHouseholdFee[]>`, `save(entries, removedKeys, year, email): Promise<void>`; token `HOUSEHOLD_FEES_BACKEND`) and `apps/web/src/app/quote/testing.ts` (in-memory fake with `failWith`, records calls; fixture year built on `sampleBackend()` of `apps/web/src/app/famiglie/testing.ts` plus a `FakeBackend` of `apps/web/src/app/listini/testing.ts` with `SCHEDULE_2026_27`)

---

## Phase 3: User Story 1 - Vedere le quote dell'anno (Priority: P1) 🎯 MVP

**Goal**: pagina Quote con nuclei, dettaglio del calcolo, totale dell'anno, avvisi.

**Independent Test**: dati finti 2026 con 9 famiglie confermate → 19 nuclei, 17 calcolati per 565,00 €, 2 non previsti.

### Tests for User Story 1 ⚠️ (write first, must fail)

- [X] T005 [P] [US1] Write `packages/families/tests/households.test.ts` (H1–H4): with the three sample files and the 9 families confirmed (build `ConfirmedFamily` + memberships from `suggestFamilies` output) → 19 households (9 `f-` + 10 `p-`), `unconfirmedSuggested` 0; without confirmations → 37 households of 1 and `unconfirmedSuggested` 9; `householdFees(…, SCHEDULE_2026_27)` → 17 `calculated` summing 56500, `900004` `notCovered` `householdTooLarge`, GATTI MIA `memberUnderMinAge`; the 29 examples of `packages/fees/tests/fixtures/examples.ts` turned into confirmed families (members with fake IDs) and calculated with the schedule serialized/deserialized like the archive (`scheduleToDocument`-like plain object) give the same totals (SC-001)
- [X] T006 [P] [US1] Write `apps/web/src/app/quote/fees.service.spec.ts` and `apps/web/src/app/quote/pages/fees/fees-page.spec.ts` (US1, contract app-routes.md): totals line "Totale 2026/27: …€ · N nuclei calcolati · 0 quote manuali · M nuclei da decidere"; household titles ("Famiglia di VERDI PAOLO · N. Legame 900002", single "MORETTI CARLA"); detail lines with age, band label (ACR/Giovanissimi/Giovani/Adulti), full fee, benefit ("sconto 20%", "gratis", pacchetto), amount; "Pacchetto 2 ACR · 25,00 €"; unconfirmed suggested warning with link `/famiglie`; missing fee schedule → "Manca il listino 2027/28. Crealo nella sezione Listini." and no fees; empty year message with link `/importa`; `?nucleo=` opens that household

### Implementation for User Story 1

- [X] T007 [US1] Implement `householdsOfYear` (`packages/families/src/households.ts`) and `householdFees` (`packages/families/src/household-fees.ts`, only `calculateHouseholdFee` + schedule) and export them until T005 passes
- [X] T008 [US1] Implement `apps/web/src/app/quote/fees.service.ts` (load in parallel: year members, confirmed families, memberships via `FAMILIES_BACKEND`, schedule via `FEE_SCHEDULE_BACKEND.get(year)`, saved fees via `HOUSEHOLD_FEES_BACKEND`; computed households, fees, totals; texts with `formatEuros`) and `apps/web/src/app/quote/pages/fees/fees-page.ts` (Material, 360 px, `PendingTasks` for async) until T006 passes; route `quote` (guard `allowed`) in `apps/web/src/app/app.routes.ts`; link "Quote" in `apps/web/src/app/pages/home/home.ts` (+ spec); link "Vedi la quota" (`/quote?anno=Y&nucleo=f-{id}`) on confirmed families in `apps/web/src/app/famiglie/pages/families/families-page.ts` (+ spec)

**Checkpoint**: quote dell'anno visibili (non ancora salvate)

---

## Phase 4: User Story 2 - Quota manuale dei nuclei non previsti (Priority: P1)

**Goal**: motivo dei non previsti, importo del nucleo con nota obbligatoria, conferma per 0,00 €, salvata con chi/quando.

**Independent Test**: GATTI MIA 15,00 € con nota → quota manuale, totale +15,00 €; senza nota non si salva; 0,00 € chiede conferma.

### Tests for User Story 2 ⚠️ (write first, must fail)

- [X] T009 [P] [US2] Extend `firebase/tests/rules.test.ts` with section "K – quote" (K1–K7, contract firestore-fees.md): unauthorized read/write → denied; authorized read → allowed; valid calculated fee and valid manual fee (also `manualCents` 0) → allowed; manual without note, empty note, `manualCents` ≠ `totalCents`, unknown `reason`, `lines` on a manual fee → denied; negative or non-integer total, unknown `kind`, extra field, ID ≠ `{year}_{householdKey}`, key not matching `(f|p)-.+` → denied; `savedBy` of another or client `savedAt` → denied; update and delete by authorized → allowed
- [X] T010 [P] [US2] Write `apps/web/src/app/quote/firestore-fees-backend.emulator.test.ts`: `save` of one manual and one calculated entry, `saved(2026)` reads them back (lines, note, reason, `savedBy` lowercase, recent `savedAt`); nothing for 2027
- [X] T011 [P] [US2] Extend `fees.service.spec.ts` and `fees-page.spec.ts`: not covered reasons ("Non previsto dal listino: il nucleo ha più di 4 persone.", "… c'è un componente sotto i 6 anni.", "… data di nascita incoerente con l'anno."); manual form with `parseEuros` messages and "Scrivi una nota che spieghi la quota."; 0,00 € opens "Il nucleo non paga nulla: confermi?" and saves only on "Conferma"; saved manual shows "Quota manuale: 140,00 € — nota — inserita il … da …" and is added to the year total; network error → "Impossibile salvare. Controlla la connessione e riprova. Non è stato salvato nulla."; leaving with an open manual form asks confirmation

### Implementation for User Story 2

- [X] T012 [US2] Add rules in `firebase/firestore.rules` (`match /householdFees/{feeId}` per research R6) until T009 passes
- [X] T013 [US2] Implement `apps/web/src/app/quote/firestore-fees-backend.ts` (`saved` = `householdFees where associationYear == year`; `save` = `runTransaction` with only `set`/`delete`, `serverTimestamp()`, lowercase email, ID `{year}_{householdKey}`) until T010 passes; provide `HOUSEHOLD_FEES_BACKEND` in `apps/web/src/app/app.config.ts`; add the emulator test to `test:integration` in `apps/web/package.json`
- [X] T014 [US2] Add the manual fee flow to `fees.service.ts` (`startManual(key)`, `saveManual(key, euros, note, confirmedZero)`, `hasUnsavedChanges`) and `fees-page.ts`, `canDeactivate: [unsavedChangesGuard]` on `quote` until T011 passes

**Checkpoint**: tutti i nuclei hanno una quota o una quota manuale

---

## Phase 5: User Story 3 - Salvare le quote e ricalcolarle (Priority: P2)

**Goal**: salvataggio dell'anno, confronto con il salvato, "Aggiorna questa quota", "Aggiorna tutte".

**Independent Test**: salvare il 2026, cambiare la quota Adulti del listino → "Quote da ricalcolare", totali salvati invariati; "Aggiorna questa quota" su uno, poi "Aggiorna tutte".

### Tests for User Story 3 ⚠️ (write first, must fail)

- [X] T015 [P] [US3] Write `packages/families/tests/compare.test.ts` (H5–H12): `toSavedCalculated`; `compareWithSaved` → all `new` without saved; `unchanged` when equal; schedule with a different adult fee → `changed` only for households with adults; family with a member removed → `changed` and the removed member `new`; manual with same members → `unchanged`, `needsManual` false; manual with changed members → `changed`, `needsManual` true while still not covered; saved key no longer present → `removed`; `yearTotals` sums calculated + valid manual, counts `missing` and `toUpdate`
- [X] T016 [P] [US3] Extend `firebase/tests/rules.test.ts` (K8): 120 fees in one write → allowed
- [X] T017 [P] [US3] Extend `firestore-fees-backend.emulator.test.ts`: `save` with `removedKeys` deletes them in the same transaction; 120 entries in one `save`
- [X] T018 [P] [US3] Extend `fees.service.spec.ts` and `fees-page.spec.ts`: "Quote non ancora salvate" + "Salva le quote dell'anno" saves all calculated households (manual ones untouched); "Quote salvate il 17/11/2026 da …"; after a schedule change "Quote da ricalcolare: N nuclei sono cambiati.", household shows "Salvata: 64,00 € · Ora: 66,00 €" and "Aggiorna questa quota" updates only it; "Aggiorna tutte" updates all `changed`/`new` and deletes `removed`; manual fee survives "Aggiorna tutte" while members are the same

### Implementation for User Story 3

- [X] T019 [US3] Implement `toSavedCalculated`, `compareWithSaved`, `yearTotals` in `packages/families/src/household-fees.ts` until T015 passes
- [X] T020 [US3] Add save/compare/update flows to `fees.service.ts` and `fees-page.ts` (`saveYear()`, `updateOne(key)`, `updateAll()`) until T018 passes; re-run T016/T017

**Checkpoint**: tutte le storie; tutti i test verdi

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T021 [P] Update `packages/families/README.md` (households and fees API) and `packages/fees/README.md` (used by 010)
- [X] T022 [P] Privacy and "no amounts in code" check: no `console.*`, no network calls, no euro amounts or percentages in `apps/web/src/app/quote` and the new `packages/families/src` files (amounts only from the schedule)
- [X] T023 Run full suite: `npm run typecheck`, `npm test`, `npm run test:rules`, `npm run test:integration -w web`, `npm run build -w web`
- [X] T024 [P] Update `docs/roadmap.md` (010 ✅ when released) and `CLAUDE.md`
- [ ] T025 Manual scenarios M1–M7 of `specs/010-quote-famiglia/quickstart.md` (M1: page under 3 s)
- [ ] T026 Release only with all tests green and the user's OK: `npx firebase deploy --only firestore:rules,hosting --project tesseramento-ac`

---

## Dependencies & Execution Order

- Setup → Foundational → US1 → US2 → US3 → Polish
- Same file in sequence: `household-fees.ts` T007 → T019; `fees.service.ts` T008 → T014 → T020; `fees-page.ts` T008 → T014 → T020; `rules.test.ts` T009 → T016; emulator test T010 → T017

### Parallel Opportunities

- T004 with T003; US1 tests T005–T006; US2 tests T009–T011; US3 tests T015–T018; Polish T021, T022, T024

---

## Parallel Example: User Story 1

```bash
Task: "T005 households.test.ts (file finti, 29 esempi)"
Task: "T006 fees service/page specs"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 + 2
2. Phase 3: quote calcolate visibili (nessun salvataggio)
3. **STOP and VALIDATE**: 565,00 € sui dati finti

### Incremental Delivery

1. US1 → vedere le quote
2. US2 → quote manuali salvate (regole testate) → rilasciabile
3. US3 → salvataggio dell'anno e aggiornamenti
4. Polish → rilascio regole + hosting con il tuo ok
