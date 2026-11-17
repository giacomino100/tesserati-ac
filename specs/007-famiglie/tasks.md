---

description: "Task list for feature 007 – Famiglie"
---

# Tasks: Famiglie

**Input**: Design documents from `/specs/007-famiglie/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (families-api.md, firestore-families.md, app-routes.md), quickstart.md

**Tests**: OBBLIGATORI — constitution III (nuove collezioni: regole testate sull'emulatore prima del rilascio) e logica
pura del raggruppamento (test prima del codice, devono fallire prima di passare).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Solo dati finti (nomi inventati, file di `docs/dominio/excel-esempio/`, `*@example.org`). Mai nomi nei log.

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Verify the 006 baseline is green on this branch: `npm run typecheck`, `npm test`, `npm run test:rules`, `npm run test:integration -w web` (JDK 21 via `JAVA_HOME`)
- [X] T002 Create workspace `packages/families` mirroring `packages/import`: `package.json` (`"name": "@tesseramento/families"`, `"private": true`, `"type": "module"`, `"exports": { ".": "./src/index.ts" }`, scripts `test` = `vitest run`, `typecheck`; **no runtime dependencies**; devDependencies `@types/node`, `typescript ~6.0.0`, `vitest`, `@tesseramento/import` `"*"` and SheetJS `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` for the sample-file tests), `tsconfig.json`, `vitest.config.ts`, `src/index.ts`; add `"@tesseramento/families": "*"` to `apps/web/package.json`; `npm install`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tipi, `parseBond`, backend astratto e backend finto

- [X] T003 [P] Write `packages/families/tests/bond.test.ts` (F1): `parseBond('C3')` → `{ kind: 'C', size: 3 }`, `parseBond(' n2 ')` → `{ kind: 'N', size: 2 }`, `'X'`, `''`, `'3'`, `undefined` → `undefined`
- [X] T004 Define `packages/families/src/types.ts` exactly as data-model.md (`YearMember`, `ConfirmedFamily` with `origin: 'legame' | 'manuale'`, `Bond`, `FamilyWarning` (`sizeMismatch` with `expected`/`found`, `bondMismatch` with `bonds`), `SuggestedFamily` (`bondId`, `members`, `bond?`, `warnings`, `confirmable`), `ProposedAddition`, `YearFamilies`, `FamilyIssue` (`tooFew` | `notInYear` | `inOtherFamily` with `personId`, `familyId`)); implement `packages/families/src/bond.ts` until T003 passes; export from `src/index.ts`
- [X] T005 [P] Create `apps/web/src/app/famiglie/families-backend.ts`: interface `FamiliesBackend` with `importedYears()`, `yearMembers(year): Promise<YearMember[]>`, `confirmedFamilies(year): Promise<ConfirmedFamily[]>`, `confirm(families: FamilyDraft[], email): Promise<void>` (`FamilyDraft` = `{ id?, associationYear, memberIds, origin, bondId? }`), `dissolve(familyId): Promise<void>`; errors `MemberInOtherFamilyError(personId)`; token `FAMILIES_BACKEND`
- [X] T006 [P] Create `apps/web/src/app/famiglie/testing.ts` with `FakeFamiliesBackend` (in-memory members per year, confirmed families with auto IDs, same rules as Firestore: ≥ 2 members, one family per person per year → `MemberInOtherFamilyError`; `failWith` injection; records calls) and `yearMember(...)` helper

**Checkpoint**: `npm test -w @tesseramento/families`, `npm run typecheck` green

---

## Phase 3: User Story 1 - Vedere le famiglie suggerite dell'anno (Priority: P1) 🎯 MVP

**Goal**: pagina Famiglie con famiglie suggerite, avvisi sul `Legame`, tesserati senza famiglia.

**Independent Test**: tre elenchi finti del 2026 → 9 suggerite (2,3,4,6,2,3,2,3,2), 0 avvisi, 10 senza famiglia; solo ACR → avviso su 900002.

### Tests for User Story 1 ⚠️ (write first, must fail)

- [X] T007 [P] [US1] Write `packages/families/tests/suggest.test.ts` (F2–F4, F11) with synthetic members and with the three sample files (parsed with `@tesseramento/import` and turned into `YearMember` with fake IDs and the list of each file): 9 suggested with sizes 2,3,4,6,2,3,2,3,2 sorted by `bondId`, members from the oldest to the youngest, 0 warnings, 10 without family; ACR file only → family `900002` with 1 member, `sizeMismatch` expected 3 found 1, `confirmable` false; `C3` + `C4` in the same `bondId` → `bondMismatch` `['C3','C4']`
- [X] T008 [P] [US1] Write `apps/web/src/app/famiglie/pages/families/families-page.spec.ts` (US1 part, contract app-routes.md): year selector as in Tesserati; summary "9 famiglie suggerite · 0 confermate · 10 tesserati senza famiglia"; a family card "N. Legame 900002 · C3" with members "VERDI PAOLO, 20/01/1980 · Adulti"; warning "Il Legame C3 indica 3 componenti, ne sono stati trovati 1."; section "Senza famiglia"; empty state "Nessun tesserato importato per questo anno." with link `/importa`
- [X] T009 [P] [US1] Write `apps/web/src/app/famiglie/firestore-families-backend.emulator.test.ts` (seed via REST "Bearer owner"): `yearMembers(2026)` joins adhesions of the year with persons (names, birth date, list from `importId`, `bond`, `bondId`), excludes other years; `importedYears()`; `confirmedFamilies(2026)` empty

### Implementation for User Story 1

- [X] T010 [US1] Implement `suggestFamilies` in `packages/families/src/suggest.ts` (research R6; confirmed families' members excluded from suggestions; `sizeMismatch` counts also members already confirmed with the same `bondId`) until T007 passes
- [X] T011 [US1] Implement `yearMembers`, `importedYears`, `confirmedFamilies` in `apps/web/src/app/famiglie/firestore-families-backend.ts` (`confirm`/`dissolve` throw "non implementato" for now) until T009 passes; provide `FAMILIES_BACKEND` in `apps/web/src/app/app.config.ts`
- [X] T012 [US1] Implement `apps/web/src/app/famiglie/families.service.ts` (signals: year, members, confirmed, computed `YearFamilies` via `suggestFamilies`, loading/error; `PendingTasks` for async loads as in `tesserati/pages/members/members-page.ts`) and `apps/web/src/app/famiglie/pages/families/families-page.ts` (Material, dates GG/MM/AAAA, list labels "ACR"/"Giovani"/"Adulti", 360 px) until T008 passes; route `famiglie` (guard `allowed`) in `apps/web/src/app/app.routes.ts`; link "Famiglie" in `apps/web/src/app/pages/home/home.ts` (+ `home.spec.ts`)
- [X] T013 [US1] Add the emulator test to the `test:integration` script in `apps/web/package.json` (chained, in series)

**Checkpoint**: famiglie suggerite visibili sul file finto

---

## Phase 4: User Story 2 - Confermare le famiglie (Priority: P1)

**Goal**: conferma singola e "Conferma tutte", salvate per anno con chi/quando; aggiunte proposte.

**Independent Test**: "Conferma tutte" con i file finti → 9 famiglie confermate nel 2026, 0 nel 2027; un tesserato importato dopo con lo stesso `N. Legame` compare come aggiunta proposta.

### Tests for User Story 2 ⚠️ (write first, must fail)

- [X] T014 [P] [US2] Extend `packages/families/tests/suggest.test.ts` (F5, F6, F12) using the new third parameter `memberships` (personId → familyId): with family 900003 confirmed with 3 of 4 members, the 4th is in `additions` for that family and not suggested again; a person in a manual confirmed family is not among the members of the suggested family of her `bondId` but is in its `elsewhere` with her family ID; a person in the `memberIds` of A and B with membership to B is ignored in A, which gets the warning `inconsistent`; a membership to a non-existing family is ignored
- [X] T015 [P] [US2] Extend `firebase/tests/rules.test.ts` with section "J – famiglie" (J1–J6, J10 part, J11: 8 families of 2 + 16 memberships in one `writeBatch` → allowed, as one group of "Conferma tutte"): unauthorized read/write of `families` and `familyMemberships` → denied; authorized read → allowed; family of 3 + 3 memberships in one `writeBatch` → allowed; 1 or 21 members, extra field, `origin: 'altro'`, `associationYear: '2026'` → denied; `confirmedBy` of another user or client `confirmedAt` → denied; update changing `associationYear` → denied
- [X] T016 [P] [US2] Extend `apps/web/src/app/famiglie/firestore-families-backend.emulator.test.ts`: `confirm` of 2 drafts writes 2 families (`origin 'legame'`, `bondId`, `confirmedBy` lowercase) and their memberships; `confirmedFamilies(2026)` returns them; nothing in 2027; persons and adhesions unchanged
- [X] T017 [P] [US2] Extend `families-page.spec.ts` and write `apps/web/src/app/famiglie/families.service.spec.ts`: "Conferma" on a suggested family → confirmed card "Confermata il GG/MM/AAAA da email"; "Conferma tutte" confirms all confirmable and reports "Confermate 8 famiglie; 1 famiglia con un solo componente non confermata." when one has 1 member; with 20 confirmable families the backend receives 3 `confirm` calls of at most 8 families each, and a failure in the 2nd reports "Confermate 8 famiglie su 20. Impossibile salvare le altre: controlla la connessione e riprova."; a suggested family shows the note "VERDI SOFIA è nella famiglia di VERDI PAOLO" from `elsewhere`; a confirmed family with warning `inconsistent` shows "Dati incoerenti per …"; proposed addition "Aggiungi VERDI SOFIA (stesso N. Legame)" adds her via a confirm of the updated family; network error → "Impossibile salvare. Controlla la connessione e riprova. Non è stato salvato nulla."

### Implementation for User Story 2

- [X] T018 [US2] Extend `suggestFamilies` in `packages/families/src/suggest.ts` with the `memberships` parameter (source of truth, research R8), `additions`, `elsewhere` and the `inconsistent` warning until T014 passes; `FamiliesBackend` gets `memberships(year): Promise<Map<string, string>>` (implemented in `firestore-families-backend.ts` with `familyMemberships where associationYear == year`, and in the fake backend)
- [X] T019 [US2] Add rules in `firebase/firestore.rules` before the final deny-all (contract firestore-families.md): `match /families/{familyId}` (get/list/delete `isAllowed()`; create/update with `keys().hasOnly(['associationYear','memberIds','origin','bondId','confirmedAt','confirmedBy'])` and `hasAll` without `bondId`, `associationYear is int`, `memberIds is list && memberIds.size() >= 2 && memberIds.size() <= 20`, `origin in ['legame','manuale']`, optional `bondId` non-empty string, `confirmedAt == request.time`, `confirmedBy == ownEmail()`, update keeps `associationYear`) and `match /familyMemberships/{membershipId}` (create/update: exact keys `associationYear, personId, familyId`, `membershipId == string(associationYear) + '_' + personId`, `getAfter(families/familyId)` exists with same `associationYear` and `memberIds.hasAny([personId])`; delete: `!existsAfter(families/resource.data.familyId) || !getAfter(...).data.memberIds.hasAny([resource.data.personId])`) — until T015 passes
- [X] T020 [US2] Implement `confirm(drafts, email)` in `apps/web/src/app/famiglie/firestore-families-backend.ts` (research R3: one `runTransaction`; read previous family for updates and memberships of all members; other family → `MemberInOtherFamilyError`; `serverTimestamp()`; delete memberships of removed members) until T016 passes
- [X] T021 [US2] Add `confirm(family)`, `confirmAll()` (groups of at most 8 families, one backend `confirm` per group, stop at the first failure and report the count, research R3), `addProposed(addition)` to `families.service.ts` and the buttons/messages/notes to `families-page.ts` until T017 passes

**Checkpoint**: famiglie confermate e salvate per anno

---

## Phase 5: User Story 3 - Correggere le famiglie (Priority: P2)

**Goal**: togliere/aggiungere componenti, creare a mano, riaprire, sciogliere; una famiglia per persona; almeno 2.

**Independent Test**: togliere un figlio da 900003 e confermare → 3 componenti, figlio tra le aggiunte; creare una famiglia manuale da due senza famiglia; sciogliere una famiglia → componenti di nuovo suggeriti.

### Tests for User Story 3 ⚠️ (write first, must fail)

- [X] T022 [P] [US3] Write `packages/families/tests/validate.test.ts` (F7–F10): `validateFamily` → `tooFew` with 1 member; `inOtherFamily` for a person in another confirmed family; no issue for own members when editing (`familyId`); `notInYear` for an unknown ID
- [X] T023 [P] [US3] Extend `firebase/tests/rules.test.ts` (J7–J10): membership for a person not in the family, or with inconsistent ID → denied; moving a person from family A to B in one write (A without her, B with her, membership updated) → allowed, membership pointing to B while B does not contain her → denied; removing a member (family update + membership delete) → allowed, deleting the membership of a person still in the family → denied; dissolving (delete family + memberships) → allowed
- [X] T024 [P] [US3] Extend `apps/web/src/app/famiglie/firestore-families-backend.emulator.test.ts`: correction (remove one member) updates family and deletes that membership; adding a person already in another family → `MemberInOtherFamilyError`, nothing written; `dissolve` deletes family and memberships
- [X] T025 [P] [US3] Extend `families.service.spec.ts` and `families-page.spec.ts`: "Correggi" → members with "Togli", "Aggiungi un tesserato" listing only people without family, "Conferma" disabled with fewer than 2 ("Una famiglia ha almeno 2 componenti."); "Crea famiglia" from selected people without family → confirmed as "creata a mano"; adding someone already in a family is not offered and the service rejects it with "VERDI SOFIA è già nella famiglia di VERDI PAOLO: toglila prima da lì."; "Sciogli famiglia" opens a dialog "Tutti i componenti resteranno senza famiglia." and on "Sciogli" calls `dissolve`; `MemberInOtherFamilyError` from the backend → reload and "Le famiglie sono state modificate da qualcun altro. La pagina è stata aggiornata."; leaving with an open correction asks confirmation (`canDeactivate` with `unsavedChangesGuard`)

### Implementation for User Story 3

- [X] T026 [US3] Implement `validateFamily` in `packages/families/src/validate.ts` and export it until T022 passes; re-run `npm run test:rules` for T023 (adjust rules only if needed)
- [X] T027 [US3] Implement `dissolve` in `apps/web/src/app/famiglie/firestore-families-backend.ts` until T024 passes
- [X] T028 [US3] Add correction drafts (`startEdit`, `removeMember`, `addMember`, `createFamily`, `cancelEdit`, `dissolve`, `hasUnsavedChanges`) to `families.service.ts`, the UI to `families-page.ts` (dialog with `MatDialog` or inline confirmation as in listini) and `canDeactivate: [unsavedChangesGuard]` on the `famiglie` route until T025 passes

**Checkpoint**: tutte le storie; tutti i test verdi

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T029 [P] Write `packages/families/README.md` (Italian: purpose, API, rules from `regole-famiglia.md` §0–§1)
- [X] T030 [P] Privacy check: no `console.*` or network calls in `apps/web/src/app/famiglie` and `packages/families/src`; families documents hold only IDs, year, origin, bond ID, who/when
- [X] T031 Run full suite: `npm run typecheck`, `npm test`, `npm run test:rules`, `npm run test:integration -w web`, `npm run build -w web`
- [X] T032 [P] Update `docs/roadmap.md` (007 ✅ when released) and `CLAUDE.md`
- [ ] T033 Manual scenarios M1–M7 of `specs/007-famiglie/quickstart.md` (measure "Conferma tutte" in M2: under 1 minute, SC-002)
- [X] T034 Release only with all tests green and the user's OK: `npx firebase deploy --only firestore:rules,hosting --project tesseramento-ac`

---

## Dependencies & Execution Order

- Setup (T001–T002) → Foundational (T003–T006) → US1 → US2 → US3 → Polish
- US2 needs the page of US1; US3 needs `confirm` of US2
- Same file in sequence: `suggest.ts` T010 → T018; `firestore-families-backend.ts` T011 → T020 → T027; `families.service.ts` T012 → T021 → T028; `families-page.ts` T012 → T021 → T028; `rules.test.ts` T015 → T023

### Parallel Opportunities

- T003 with T005, T006; US1 tests T007–T009; US2 tests T014–T017; US3 tests T022–T025; Polish T029, T030, T032

---

## Parallel Example: User Story 1

```bash
Task: "T007 suggest.test.ts (file finti)"
Task: "T008 families-page.spec.ts (famiglie suggerite)"
Task: "T009 emulator test (tesserati dell'anno)"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 + 2
2. Phase 3: famiglie suggerite in sola lettura
3. **STOP and VALIDATE** con i tre file finti

### Incremental Delivery

1. US1 → vedere le famiglie
2. US2 → confermarle (regole testate) → rilasciabile
3. US3 → correggerle, crearle, scioglierle
4. Polish → rilascio regole + hosting con il tuo ok
