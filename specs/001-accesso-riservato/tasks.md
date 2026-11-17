---

description: "Task list for feature 001 – Accesso riservato"
---

# Tasks: Accesso riservato

**Input**: Design documents from `/specs/001-accesso-riservato/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/firestore-access.md, contracts/app-routes.md, quickstart.md

**Tests**: OBBLIGATORI — constitution, principio III: le Security Rules sono coperte da test
sull'emulatore Firebase; la logica dell'app ha test Vitest. I test si scrivono prima del codice
e devono fallire prima di passare.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 (accesso di un utente autorizzato), US2 (rifiuto di chi non è autorizzato)
- Percorsi relativi alla radice del repository; app in `apps/web/`, regole in `firebase/`
- Interfaccia in italiano; codice e identificatori in inglese; nessun dato reale (solo `*@example.org`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: workspace, app Angular vuota ma compilabile, configurazione Firebase e emulatori

- [X] T001 Verify the base branch: specification 002 is merged into `main` (done with a local git merge) and `main` is merged into `001-accesso-riservato` (`package.json`, `tsconfig.base.json` and `packages/fees/` must exist); if not, stop and ask the user
- [ ] T002 Verify a JDK is installed (`java -version`); if missing, stop and ask the user to install JDK 21 LTS (needed by the Firestore emulator, research R6)
- [X] T003 Update root `package.json`: `"workspaces": ["packages/*", "apps/*", "firebase"]`, `"engines": { "node": "^22.22.3 || ^24.15.0" }`; scripts `"emulators": "npm run emulators -w firebase"`, `"test:rules": "npm run test:rules -w firebase"`, `"start": "npm start -w web"`; keep existing `test` and `typecheck` (workspace-wide)
- [X] T004 Generate the Angular 22 app in `apps/web` with the Angular CLI (`npx @angular/cli@22 new web --directory apps/web`): standalone components, SCSS, routing, **no SSR**, no git init, Vitest as test runner; package name `web`; make `apps/web/tsconfig.json` keep `strict` and TypeScript `~6.0`; delete generated sample content (keep only the shell component)
- [X] T005 In `apps/web` add dependencies `firebase@^13.4` and `@angular/material@^22.2` (do **not** add `@angular/fire`, research R1); set up a Material theme in `apps/web/src/styles.scss` and `lang="it"` in `apps/web/src/index.html`
- [X] T006 [P] Create workspace `firebase/package.json` (name `@tesseramento/rules`, `"private": true`, `"type": "module"`) with devDependencies `firebase-tools@^15`, `@firebase/rules-unit-testing@^6`, `firebase@^13.4`, `vitest@^5.1`, `typescript@~6.0`; scripts `"emulators": "firebase emulators:start --only auth,firestore --project demo-tesseramento --config ../firebase.json"`, `"test:rules": "firebase emulators:exec --only firestore --project demo-tesseramento --config ../firebase.json \"vitest run\""` (emulators always use the `demo-tesseramento` project, research R4b); add `firebase/tsconfig.json` extending `../tsconfig.base.json` and `firebase/vitest.config.ts` with `test.include: ['tests/**/*.test.ts']`
- [X] T007 [P] Create `firebase.json` (Hosting: `public` = Angular build output of `apps/web` (`apps/web/dist/web/browser`), SPA rewrite `** → /index.html`; `firestore.rules` = `firebase/firestore.rules`; emulators: `auth` 9099, `firestore` 8080, `ui` enabled) and `.firebaserc` with default project `tesseramento-ac` (used only by `firebase deploy`; emulators and tests use `demo-tesseramento`, research R4b)
- [X] T008 Move the Firebase web config: `git mv config/firebase.config.ts apps/web/src/app/core/firebase.config.ts` (create the folder if needed) and remove the now-empty `config/` folder (plan R8)
- [X] T009 [P] Ensure `.gitignore` ignores `firebase-debug.log`, `firestore-debug.log`, `ui-debug.log`, `.firebase/`, `apps/web/dist/`, `apps/web/.angular/`
- [X] T010 Run `npm install` at repo root and commit `package-lock.json`; verify `npm run typecheck` and `npm test -w @tesseramento/fees` still pass

**Checkpoint**: `npm start -w web` serves an empty app; `npm test -w @tesseramento/fees` still 126 passed

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: regole di sicurezza testate, funzioni pure di sessione, init Firebase — servono a entrambe le user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Security Rules (principio III)

- [ ] T011 Write failing tests `firebase/tests/rules.test.ts` with `@firebase/rules-unit-testing` against the Firestore emulator (project id `demo-tesseramento`, rules loaded from `firebase/firestore.rules`), covering guarantees A1–A8 of `contracts/firestore-access.md`: (A1) unauthenticated get/list/create/update/delete on `allowedEmails` and on an unknown collection `anything/x` all denied; (A2) authenticated with `email_verified: false`, and authenticated not in list, cannot read/write anything except `get` of their own non-existent `allowedEmails/<own email lowercase>`; (A3) token email `Autorizzato@Example.org` with document id `autorizzato@example.org` is allowed (case-insensitive); (A4) after deleting the document the same user's next read of the probe collection is denied. Because no real collection uses `isAllowed()` yet, the test builds its rules text from `firebase/firestore.rules` by inserting, immediately before the line `match /{document=**}`, a test-only `match /probe/{id} { allow read: if isAllowed(); }`; use this probe for every check on "is the user allowed" (A3, A4, A5, A8); (A5) token with `auth_time` older than 7 days: every request denied, `auth_time` exactly 7 days old allowed; (A6) no user (authorized or not) can create/update/delete `allowedEmails/*` nor `list` it; (A7) unknown collection denied to everyone, including authorized users; (A8) empty list → authorized-looking user not allowed. Use only `*@example.org` emails. If the emulator does not populate `auth_time`, pass it explicitly in the token claims (research R5)
- [ ] T012 Implement `firebase/firestore.rules` per `contracts/firestore-access.md`: `rules_version = '2'`; a function `isAllowed()` = authenticated ∧ `request.auth.token.email_verified == true` ∧ `exists(/databases/$(database)/documents/allowedEmails/$(request.auth.token.email.lower()))` ∧ session fresh (`request.time.toMillis() - request.auth.token.auth_time * 1000 <= 7 * 24 * 60 * 60 * 1000`); `match /allowedEmails/{email}`: `allow get` only if authenticated ∧ `email_verified` ∧ session fresh ∧ `email == request.auth.token.email.lower()` (document id = "email in minuscolo"), `allow list, create, update, delete: if false`; final `match /{document=**} { allow read, write: if false; }` (this exact line must stay as the last `match`, T011 injects its probe just before it); future collections will be added before it, each starting from `isAllowed()`
- [ ] T013 Run `npm run test:rules` until T011 passes (all A1–A8 green)

### Funzioni pure e inizializzazione

- [X] T014 [P] Write failing tests `apps/web/src/app/core/session.spec.ts` for `normalizeEmail(email)` (trim + lowercase: `' Mario@Example.ORG '` → `'mario@example.org'`) and `isSessionExpired(lastSignInTime, now)` (`SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000`): exactly 7 days → not expired; 7 days + 1 ms → expired; 1 hour → not expired; unparsable or missing date → expired
- [X] T015 Implement `apps/web/src/app/core/session.ts` (exports `SESSION_MAX_AGE_MS`, `normalizeEmail`, `isSessionExpired`); pure functions, no Firebase or Angular imports (makes T014 pass)
- [X] T016 Create `apps/web/src/app/core/firebase.ts`: `initializeApp(isDevMode() ? { ...firebaseConfig, projectId: 'demo-tesseramento' } : firebaseConfig)` (so the app and the emulators/tests see the same project, research R4b), export `auth = getAuth(app)` and `db = getFirestore(app)`; when `isDevMode()` call `connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })` and `connectFirestoreEmulator(db, '127.0.0.1', 8080)`; do **not** import `firebase/analytics`
- [X] T017 Create `apps/web/src/app/core/auth-backend.ts`: interface `AuthBackend` with `onAuthChanged(cb)`, `signInWithGoogle()`, `signOut()`, `deleteCurrentUser()`, `isEmailAllowed(email)` and a minimal `SessionUser` type `{ displayName: string | null; email: string; emailVerified: boolean; lastSignInTime: string | undefined }`; export `AUTH_BACKEND = new InjectionToken<AuthBackend>('AUTH_BACKEND')` (lets `AuthService` be tested with a fake)

**Checkpoint**: `npm run test:rules` and `npm test -w web` (session) pass; the rules deny everything but the own-document `get`

---

## Phase 3: User Story 1 - Accesso di un utente autorizzato (Priority: P1) 🎯 MVP

**Goal**: un utente in elenco accede con Google, vede nome ed "Esci", resta dentro 7 giorni, può uscire; funziona su telefono

**Independent Test**: spec Vitest di servizio, guardia e pagine con backend simulato + verifica manuale M1–M3, M6 sull'emulatore con `autorizzato@example.org`

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T018 [P] [US1] Write `apps/web/src/app/core/auth.service.spec.ts` with a fake `AuthBackend`: initial state `loading`; no user → `signedOut`; user `emailVerified: true` + `isEmailAllowed → true` + `lastSignInTime` 1 hour ago → state `allowed` with `displayName`; user whose `lastSignInTime` is older than 7 days → `backend.signOut()` called and state `signedOut`; `signOut()` → backend signOut called and state `signedOut`; `signIn()` with popup closed by the user (error code `auth/popup-closed-by-user` or `auth/cancelled-popup-request`) → state `signedOut` and message `Accesso annullato. Riprova.`; network failure (`auth/network-request-failed`) → message `Impossibile connettersi. Controlla la connessione e riprova.`; any other error → `Qualcosa è andato storto. Riprova tra poco.`; no message logged with name or email
- [X] T019 [P] [US1] Write `apps/web/src/app/core/auth.guard.spec.ts` for the routing table of `contracts/app-routes.md`: `signedOut` + `/` → redirect `/accesso` (remembering the requested URL); `allowed` + `/accesso` → `/`; `allowed` + `/` → allowed; `loading` → no page rendered (guard waits for a non-loading state); after sign-in the user returns to the URL originally requested; on every navigation the guard calls `AuthService.revalidate()` (see T027/T031)
- [X] T020 [P] [US1] Write component specs: `apps/web/src/app/pages/login/login.spec.ts` (shows button "Accedi con Google"; click calls `AuthService.signIn()`; shows the error message from the service; on the connection error also shows a button "Riprova" that calls `signIn()` again), `apps/web/src/app/pages/home/home.spec.ts` (shows the user's name and a button "Esci"; click calls `signOut()`; no tesserati data shown)

### Implementation for User Story 1

- [X] T021 [US1] Implement `apps/web/src/app/core/firebase-auth-backend.ts`: `FirebaseAuthBackend` implementing `AuthBackend` with `onAuthStateChanged`, `signInWithPopup(auth, new GoogleAuthProvider())`, `signOut`, `deleteUser(auth.currentUser)`, and `isEmailAllowed(email)` = `(await getDoc(doc(db, 'allowedEmails', normalizeEmail(email)))).exists()`; map Firebase user to `SessionUser` (`metadata.lastSignInTime`); no logging of user data
- [X] T022 [US1] Implement `apps/web/src/app/core/auth.service.ts`: signals `state: 'loading' | 'signedOut' | 'denied' | 'allowed'`, `user`, `errorMessage`; on every auth change apply: no user → `signedOut`; `isSessionExpired(lastSignInTime, now)` → `signOut` then `signedOut`; otherwise check `emailVerified` and `isEmailAllowed` → `allowed` (the `denied` branch is implemented in US2); `signIn()`, `signOut()` with the Italian messages of T018; provide `AUTH_BACKEND` with `FirebaseAuthBackend` in `apps/web/src/app/app.config.ts`
- [X] T023 [US1] Implement `apps/web/src/app/core/auth.guard.ts` (wait until `state !== 'loading'`, then apply the routing table of `contracts/app-routes.md`; keep the requested URL and return to it after sign-in) and `apps/web/src/app/app.routes.ts` with lazy-loaded routes `/accesso`, `/non-autorizzato` (page added in US2), `/`, fallback `**` → `/`
- [X] T024 [P] [US1] Create `apps/web/src/app/pages/login/` (standalone component, Material card and button "Accedi con Google", error message area) with fluid layout (no fixed widths, usable at 360 px)
- [X] T025 [P] [US1] Create `apps/web/src/app/pages/home/` (Material toolbar with the user's name and button "Esci", empty content area) with fluid layout
- [X] T026 [US1] Update the root component `apps/web/src/app/app.ts` / `app.html`: `<router-outlet>` plus a loading indicator while `state === 'loading'` (no other content); run `npm test -w web` and `npm run typecheck`; T018–T020 must pass

**Checkpoint**: MVP — con l'emulatore un utente in elenco entra, resta dentro al ricaricamento, esce; non-autenticati vedono solo l'accesso

---

## Phase 4: User Story 2 - Rifiuto di chi non è autorizzato (Priority: P1)

**Goal**: account Google non in elenco o con email non verificata → "Accesso non autorizzato", nessun dato, nessuna traccia (account Firebase cancellato)

**Independent Test**: spec Vitest con backend simulato + test di integrazione sull'emulatore Auth + verifica manuale M4, M5; i test delle regole (T011) già coprono il rifiuto lato dati

### Tests for User Story 2 ⚠️

- [X] T027 [P] [US2] Extend `apps/web/src/app/core/auth.service.spec.ts`: user with `emailVerified: false` → `backend.deleteCurrentUser()` then `backend.signOut()` called (in this order) and state `denied`; user with email not in list → same; `deleteCurrentUser()` rejecting → `signOut()` is still called and state is still `denied` (known limit R4); `denied` → `signOut()` from the denied page returns to `signedOut`; a user previously `allowed` whose document was removed, on reload → `denied`; `revalidate()` on an `allowed` user whose email is no longer allowed → `denied` (same delete + signOut sequence), and still `allowed` when the email is still in the list
- [X] T028 [P] [US2] Extend `apps/web/src/app/core/auth.guard.spec.ts`: `denied` + `/` → `/non-autorizzato`; `denied` + `/accesso` → `/non-autorizzato`; `signedOut` + `/non-autorizzato` → `/accesso`; `allowed` + `/non-autorizzato` → `/`
- [X] T029 [P] [US2] Write `apps/web/src/app/pages/denied/denied.spec.ts`: shows the title "Accesso non autorizzato", the text "Questo account non è abilitato. Chiedi di essere aggiunto all'elenco." and a button "Esci / prova con un altro account" that calls `signOut()`
- [ ] T030 [US2] Write the Auth-emulator integration test `apps/web/src/app/core/firebase-auth-backend.emulator.spec.ts` (separate Vitest include `**/*.emulator.spec.ts`, excluded from `npm test -w web`; add the script `"test:integration": "firebase emulators:exec --only auth,firestore --project demo-tesseramento --config ../../firebase.json \"ng test --include **/*.emulator.spec.ts\""` to `apps/web/package.json`, or the equivalent that works with the generated test runner). The popup cannot be automated, so the test does **not** call `signInWithGoogle()`: it creates the `AuthService` with `FirebaseAuthBackend` (project `demo-tesseramento`, via `firebase.ts` in dev mode), then signs in on the Auth emulator with `signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub: 'x1', email: 'estraneo@example.org', email_verified: true })))` and lets the service react to the auth-state change. Assert state `denied` and that the account no longer exists in the Auth emulator (`GET http://127.0.0.1:9099/emulator/v1/projects/demo-tesseramento/accounts`); and that `autorizzato@example.org` (document `allowedEmails/autorizzato@example.org` seeded in the Firestore emulator) reaches `allowed`. Verifies research R4 and quickstart check 5

### Implementation for User Story 2

- [X] T031 [US2] In `apps/web/src/app/core/auth.service.ts` implement the `denied` branch: when `emailVerified` is false or `isEmailAllowed` is false → `await backend.deleteCurrentUser()` (swallow its error), then `await backend.signOut()`, then set state `denied`; also treat a Firestore `permission-denied` error from `isEmailAllowed` as `denied`; add `revalidate()` (re-runs the allowed check for a signed-in user, same denied sequence) called by the guard on every navigation (T023) and by `app.ts` on `document` `visibilitychange` when the tab becomes visible (FR-006, spec Assumptions); no logging of email or name
- [X] T032 [P] [US2] Create `apps/web/src/app/pages/denied/` (standalone component, texts of T029, fluid layout usable at 360 px) and register route `/non-autorizzato` in `apps/web/src/app/app.routes.ts` with the guard rules of T028
- [ ] T033 [US2] Run `npm test -w web`, `npm run test:integration -w web` and `npm run test:rules`; T027–T030 must pass

**Checkpoint**: US1 e US2 passano; un non autorizzato non vede dati e non lascia account

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: qualità, privacy, documentazione, rilascio e PR

- [X] T034 [P] Check FR-012 / principio III: `grep -rnE "console\.(log|warn|error|info)" apps/web/src` shows no output of names, emails or tokens; no real email anywhere in repository or tests (`grep -rn "@" apps/web/src firebase/tests` shows only `example.org` and `firebaseapp` domains); `packages/fees` imports nothing from `apps/` (principio II)
- [ ] T035 [P] Check the build and the responsive layout: `npm run build -w web` succeeds with no budget errors; open the three pages at 360 px width and confirm no horizontal scroll (SC-004, quickstart M6)
- [ ] T036 Run every automatic and manual check of `specs/001-accesso-riservato/quickstart.md` on the emulator (M1–M6), including seeding `allowedEmails/autorizzato@example.org` on the emulator only (project `demo-tesseramento`), M5 without reloading the page, and write down the measured times of M2 (< 30 s) and M4 (< 5 s) for SC-001 and SC-005
- [X] T037 [P] Update `docs/dominio/utenti.md` with the known limits of "nessuna traccia" (research R4: log tecnici di Google/Firebase; account che resta se il browser si chiude a metà) and note that the privacy notice is still to be defined with the parish
- [X] T038 [P] Update `CLAUDE.md` ("Stato attuale" and the commands to run app, tests, rules tests, emulators) and `docs/roadmap.md`: 001 status → ✅ fatto
- [X] T039 **Ask the user for confirmation first** (this publishes to the production Firebase project): after the manual console steps of `quickstart.md` (Google provider, Firestore created, first email in `allowedEmails`) and with all tests green, have the user run `npx firebase login` (interactive, Claude cannot do it), then run `npx firebase deploy --only firestore:rules --project tesseramento-ac` and `npx firebase deploy --only hosting --project tesseramento-ac`; verify scenario M7 with the user's own account
- [X] T040 Open the pull request for branch `001-accesso-riservato` with a table "principio → come è rispettato" for constitution principles I–V and the quality gates (tests green, `strict` typecheck clean, Security Rules tests green, roadmap updated), as required by the constitution "Flusso di sviluppo e controlli di qualità"

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001–T002 are gates (stop and ask if they fail); T003 → T004 → T005; T006, T007, T009 in parallel after T003; T008 after T004; T010 last
- **Foundational (Phase 2)**: depends on Setup — BLOCKS all user stories. Rules track (T011 → T012 → T013) and pure-functions track (T014 → T015) are independent; T016 after T005/T008; T017 after T015
- **US1 (Phase 3)**: depends on Foundational
- **US2 (Phase 4)**: depends on Foundational and extends files of US1 (`auth.service.ts`, `auth.guard.spec.ts`, `app.routes.ts`) → run after US1
- **Polish (Phase 5)**: after all stories; T039 (deploy) needs explicit user confirmation; T040 (pull request) is the last task

### Within Each Phase

- Tests (T011, T014, T018–T020, T027–T030) are written and seen failing before their implementation (T012, T015, T021–T026, T031–T032)
- T021 → T022 → T023 → T026; T024 and T025 in parallel with T021–T023

### Parallel Opportunities

- Setup: T006, T007, T009
- Foundational: rules track ∥ pure-functions track
- US1 tests: T018, T019, T020; US1 pages: T024, T025
- US2 tests: T027, T028, T029; T032 in parallel with T031
- Polish: T034, T035, T037, T038

---

## Parallel Example: User Story 1

```bash
# Write the three US1 spec files together, then confirm they fail:
Task: "AuthService spec in apps/web/src/app/core/auth.service.spec.ts"
Task: "Guard spec in apps/web/src/app/core/auth.guard.spec.ts"
Task: "Login and home page specs in apps/web/src/app/pages/{login,home}/*.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup → Phase 2 Foundational (rules already deny everything)
2. Phase 3 US1 → **STOP and VALIDATE**: sull'emulatore un utente in elenco entra, ricarica, esce
3. Non pubblicare in produzione prima di US2: senza il rifiuto di chi non è in elenco l'app non è presentabile

### Incremental Delivery

1. + US2 → i non autorizzati vedono "Accesso non autorizzato" e non lasciano traccia
2. Polish → privacy verificata, documentazione, rilascio dopo conferma, pull request

---

## Notes

- [P] tasks = different files, no dependencies
- Commit after each task or logical group, on branch `001-accesso-riservato`
- Mai email o dati reali nei test né nel repository (constitution III); solo `*@example.org`
- Nessuna pubblicazione di regole o Hosting senza test verdi sull'emulatore e senza conferma dell'utente (T039)
- Se l'emulatore non espone `auth_time` o `deleteUser` si comporta diversamente da quanto previsto in research R4/R5: fermarsi, aggiornare `research.md` e chiedere, non improvvisare
