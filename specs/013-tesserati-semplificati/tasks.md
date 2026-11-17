---

description: "Task list for feature 013 – Tesserati semplificati"
---

# Tasks: Tesserati semplificati

**Input**: Design documents from `/specs/013-tesserati-semplificati/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (members-api.md, firestore-changes.md, app-routes.md), quickstart.md

**Tests**: OBBLIGATORI — constitution III (regole di import, adesioni: test sull'emulatore) e logica pura testata prima.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 conferma, US2 famiglia, US3 nuovo tesserato, US4 import amministratore
- Solo dati finti. Mai nomi nei log. Nessuna email nel codice.

---

## Phase 1: Setup

- [ ] T001 Verify the 011 baseline is green on this branch (`npm run typecheck`, `npm test`, `npm run test:rules`, `npm run test:integration -w web`)

## Phase 2: Foundational

- [ ] T002 Tests P1–P10 in `packages/families/tests/members-view.test.ts` (contracts/members-api.md); then implement `memberYearView`, `familyAfterConfirm`, `familyPanel` in `packages/families/src/members-view.ts` (+ types, `YearMember.paidOn?`, `YearMember.familyOptOut?`); export from `index.ts`
- [ ] T003 Rules tests "O – pagamento, famiglia, amministratore" (O1–O5) in `firebase/tests/rules.test.ts` (update the existing import tests to seed `admin: true` for the importing user); then rules in `firebase/firestore.rules` (`isAdmin()`, payment fields on renewal/new creates, payment and `familyOptOut` updates)

## Phase 3: User Story 1 - Confermare chi paga (P1) 🎯 MVP

- [ ] T004 [US1] Create `apps/web/src/app/tesserati/year-backend.ts` (interface `YearBackend`: `memberYears`, `yearMembers(year)` with `paidOn`/`familyOptOut`/`origin`/`exception`, `memberships`, `families`, `schedule`, `renew(drafts, paidOn, email)`, `undo`, `hasSavedFee`, `registerPayment(adhesionIds, paidOn, email)`, `confirmFamily(drafts, email)`, `dissolveFamily(id)`, `setFamilyOptOut(adhesionId, value)`, `changeList` from 011) and the fake in `apps/web/src/app/tesserati/testing.ts`
- [ ] T005 [US1] Rewrite `apps/web/src/app/tesserati/members.service.spec.ts` and `pages/members/members-page.spec.ts` for the single list (counts, filter, search, payment date, Conferma, Annulla conferma, Registra pagamento, no listino, network error, concurrency), then rewrite `members.service.ts` and `pages/members/members-page.ts` on `YearBackend` (remove "Allinea tutte" and the misaligned count; keep row warning, "Allinea all'età" and "Cambia elenco" as secondary actions)
- [ ] T006 [US1] Implement `apps/web/src/app/tesserati/firestore-year-backend.ts` reusing `FirestoreRenewalsBackend`, `FirestoreFamiliesBackend`, `FirestoreMembersBackend`, `FirestoreFeeScheduleBackend`; renewal drafts carry `paidOn`/`paidAt`/`paidBy`; provider in `app.config.ts`; emulator test E1–E2 in `firestore-year-backend.emulator.test.ts` (+ integration chain)

## Phase 4: User Story 2 - Famiglia (P1)

- [ ] T007 [US2] Service/page specs for the family panel (auto family after confirm, panel members and states, Conferma in panel, Togli with `familyOptOut`, Aggiungi, Crea famiglia, messages of contracts/app-routes.md); then implement the panel in `members.service.ts` / `members-page.ts`

## Phase 5: User Story 3 - Nuovo tesserato (P2)

- [ ] T008 [US3] Specs then code: `apps/web/src/app/nuovo-tesserato` takes the payment date (input `paidOn`), entry and Firestore write carry the payment fields, renewable message "È tra i tesserati del {anno}: usa Conferma nell'elenco." (no link to Riconferme)

## Phase 6: User Story 4 - Import amministratore (P1)

- [ ] T009 [US4] Specs then code: `AuthBackend.isAdmin?`, `AuthService.admin`, `requireAdmin` guard in `core/auth.guard.ts`, `/importa` with `requireAdmin`, home shows "Importa Excel" only to the administrator and no "Riconferme"; `/riconferme` redirects to `/tesserati`; remove the renewals page and service (keep backend); emulator test E3 for `isAdmin`

## Phase 7: Polish

- [ ] T010 [P] Update READMEs (`packages/families/README.md`) and `CLAUDE.md`, `docs/roadmap.md` (013 🚧/✅)
- [ ] T011 Run full suite: `npm run typecheck`, `npm test`, `npm run test:rules`, `npm run test:integration -w web`, `npm run build -w web`
- [ ] T012 Manual scenarios M1–M6 of `specs/013-tesserati-semplificati/quickstart.md`
- [ ] T013 Release only with all tests green and the user's OK; then, only with the user's explicit OK, set `admin: true` on the user's `allowedEmails` document from the console

## Dependencies

- T002, T003 → T004 → T005 → T006 → T007 → T008 → T009 → Polish
