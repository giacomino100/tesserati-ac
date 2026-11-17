---

description: "Task list for feature 004 – Import Excel ACR"
---

# Tasks: Import Excel ACR

**Input**: Design documents from `/specs/004-import-excel-acr/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (import-api.md, firestore-import.md, app-routes.md), quickstart.md

**Tests**: OBBLIGATORI — constitution, principio III (regole con logica: test sull'emulatore prima del rilascio; solo dati
finti) e scelta del piano di tenere pura e testata la trasformazione delle righe (R2). I test si scrivono prima
dell'implementazione e devono fallire prima di passare.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Percorsi relativi alla radice del repository. Solo dati finti: i file di `docs/dominio/excel-esempio/`, righe
  sintetiche con nomi inventati ed email `*@example.org`. Mai `console.*` con righe o valori delle celle.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: nuovo pacchetto puro e unica libreria nuova (SheetJS, imposta dalla constitution)

- [X] T001 Create workspace `packages/import` mirroring `packages/fees`: `packages/import/package.json` (`"name": "@tesseramento/import"`, `"private": true`, `"type": "module"`, `"exports": { ".": "./src/index.ts" }`, scripts `test` = `vitest run`, `typecheck` = `tsc --noEmit -p tsconfig.json`, devDependencies `@types/node`, `typescript ~6.0.0`, `vitest`), `packages/import/tsconfig.json` (copy of `packages/fees/tsconfig.json`), empty `packages/import/src/index.ts`; **no runtime dependencies**
- [X] T002 Install SheetJS 0.20.3 from the official CDN tarball (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`, research R1): as `dependency` of `apps/web/package.json` and as `devDependency` of `packages/import/package.json` (only for tests reading the sample files); run `npm install` at repo root and confirm `package-lock.json` pins the tarball URL
- [X] T003 [P] Add `"@tesseramento/import": "*"` to `dependencies` of `apps/web/package.json`; verify `npm run typecheck` and `npm test` still green from the repo root (the new workspace has no tests yet: add `--passWithNoTests` to its `test` script until T006)

**Checkpoint**: `npm install` clean, `npm run typecheck` green, `import('xlsx')` resolves in `apps/web`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tipi e funzioni pure di base (pulizia, date, anno, identità), backend astratto dell'app. Tutte le storie ne dipendono.

### Tests first (must FAIL before implementation)

- [X] T004 [P] Write `packages/import/tests/clean.test.ts` for `cleanText` (contract import-api.md, P11): trim, multiple spaces → one (`'GIOVANNI '` → `'GIOVANNI'`, `'VIA MANZONI  8'` → `'VIA MANZONI 8'`); `null`, `undefined`, `''`, `"''"` (two apostrophes), `'   '` → `undefined`; number `900002` → `'900002'` (no decimals); and for `parseAssociationYear`: `'Anno 2026'` → 2026, `' Anno  2026 '` → 2026, `'2026'`, `'Anno'`, `''`, `null` → `undefined`
- [X] T005 [P] Write `packages/import/tests/date.test.ts` for `toIsoDate(value, date1904)` (P12, research R4): Excel serial for 1965-03-12 in 1900 epoch and in 1904 epoch → `'1965-03-12'`; `'12/03/1965'` and `'1965-03-12'` → `'1965-03-12'`; `'31/02/2010'`, `'abc'`, `''`, `null`, negative numbers → `undefined`; result identical when `process.env.TZ` is `'America/Los_Angeles'` or `'Pacific/Kiritimati'` (pure arithmetic, no `Date` local getters)
- [X] T006 [P] Write `packages/import/tests/identity.test.ts` for `identityKey(lastName, firstName, birthDate)`: `('Rossi ', 'mario', '1965-03-12')` and `('ROSSI', ' MARIO', '1965-03-12')` give `'ROSSI|MARIO|1965-03-12'`; accents removed (`'NICOLÒ'` → `'NICOLO'`); internal spaces collapsed (`'DE  LUCA'` → `'DE LUCA'`)

### Implementation

- [X] T007 Define types in `packages/import/src/types.ts` exactly as in `specs/004-import-excel-acr/data-model.md`: `ImportRow` (`rowNumber`, `lastName`, `firstName`, `sex?: 'M' | 'F'`, `birthDate` "AAAA-MM-GG", `taxCode?` "vuoto o non di 16 caratteri alfanumerici → assente", `sector`, `exportAgeBand?`, `bond?`, `bondId?` "numero → testo senza decimali; vuoto → assente", `identityKey`), `SkipReason` (`missingLastName | missingFirstName | missingBirthDate | invalidBirthDate | duplicate`), `SkippedRow` (`rowNumber`, `reason`, `duplicateOf?`), `ParsedImport` (`ok: true` → `associationYear, rows, skipped, totalRows`; `ok: false` → `error`: `sheetNotFound | missingColumns (columns: string[]) | noRows | invalidYear | mixedYears | notAcr | allRowsSkipped`, with `skipped` for `allRowsSkipped`), `ImportPlan` (`associationYear`, `importId` `'{anno}-ACR'`, `newPersons`, `reusedPersons: { row, personId }[]`, `adhesions`, `skipped`)
- [X] T008 [P] Implement `cleanText` and `parseAssociationYear` in `packages/import/src/clean.ts` until T004 passes
- [X] T009 [P] Implement `toIsoDate` in `packages/import/src/date.ts` (serial → days since 1899-12-30, or 1904-01-01 when `date1904`; civil-from-days arithmetic; validate day/month for text dates) until T005 passes
- [X] T010 [P] Implement `identityKey` in `packages/import/src/identity.ts` (`toUpperCase`, `normalize('NFD')` + strip combining marks, collapse spaces, join with `|`) until T006 passes
- [X] T011 Export types and functions from `packages/import/src/index.ts`; remove `--passWithNoTests` from the `test` script in `packages/import/package.json`
- [X] T012 [P] Create `apps/web/src/app/importa/import-backend.ts`: interface `ImportBackend` with `yearStatus(year): Promise<{ hasFeeSchedule: boolean; alreadyImported: boolean }>`, `existingPersons(): Promise<Map<string, string>>` (identityKey → personId), `commit(plan: ImportPlan, email: string): Promise<void>`; error classes `AlreadyImportedError`, `NoFeeScheduleError`; `InjectionToken` `IMPORT_BACKEND`
- [X] T013 [P] Create `apps/web/src/app/importa/testing.ts` with `FakeImportBackend` (in-memory persons/adhesions/batches, configurable `yearStatus`, failure injection for `commit`, records commits) for component and service specs

**Checkpoint**: `npm test -w @tesseramento/import` green (T004–T006), `npm run typecheck` green

---

## Phase 3: User Story 1 - Caricare il file e vedere l'anteprima (Priority: P1) 🎯 MVP

**Goal**: l'utente sceglie il file ACR e vede anno, numero di righe, prime righe e righe saltate; annullando non si salva nulla.

**Independent Test**: con `ElencoAdesioni_ACR.xlsx` l'anteprima mostra "2026/27", 15 righe, 15 da importare; "Annulla" torna alla scelta del file e il backend finto non riceve alcun `commit`.

### Tests for User Story 1 ⚠️ (write first, must fail)

- [X] T014 [P] [US1] Write `packages/import/tests/parse-sheet.test.ts` (contract P1, P3, P8, P9, P11, P14) using synthetic rows built from the 33 headers of `docs/dominio/excel-esempio/README.md`: valid rows mapped to `ImportRow`; columns reordered + extra column → same result; row without `Nome` / without `Data Nascita` / with `'abc'` date → skipped with reason and Excel row number (header = row 1), other rows kept; `ROSSI  MARIO` and `rossi mario` same date → second skipped as `duplicate` with `duplicateOf`; `''`/`"''"`/`null` → absent fields; `N. Legame` 900002 → `'900002'`; tax code of 10 chars → absent; `Sesso` `'X'` → absent; each `ImportRow` has **only** the keys of the type (no `Indirizzo`, `Telefono`, `Pagato`, `MLAC`, `MSAC`, `SR`, `Incarico`…)
- [X] T015 [P] [US1] Write `packages/import/tests/sample-files.test.ts` reading `docs/dominio/excel-esempio/ElencoAdesioni_ACR.xlsx` with SheetJS (`XLSX.read(buffer, { type: 'buffer' })`, `sheet_to_json(ws, { header: 1, raw: true, defval: null })`, `date1904` from `wb.Workbook?.WBProps?.date1904`) → `ok`, year 2026, 15 rows, 0 skipped, `PELLEGRINO GIOVANNI` without trailing space, `GATTI MIA` (fascia `0/5`) included (FR-012), `VERDI SOFIA` with `bond 'C3'`, `bondId '900002'`, `birthDate '2016-04-09'`
- [X] T016 [P] [US1] Write `apps/web/src/app/importa/import.service.spec.ts` (preview part) with a fake workbook reader and `FakeImportBackend`: `idle → reading → preview` with year, totals, first 10 rows, skipped rows; `cancel()` returns to `idle`, clears the parsed rows from memory and no `commit` happens (FR-004, SC-003)
- [X] T017 [P] [US1] Write `apps/web/src/app/importa/pages/import/import-page.spec.ts` (preview part): file input accepts `.xlsx`; preview shows "Anno associativo 2026/27", "15 righe nel file, 15 da importare", table columns Cognome e nome / Data di nascita (GG/MM/AAAA) / Fascia d'età (export) / Legame (`C3 · 900002`), list "Riga 7: manca la data di nascita" when present, buttons "Importa" and "Annulla" (texts from `contracts/app-routes.md`)

### Implementation for User Story 1

- [X] T018 [US1] Implement `parseAdhesionSheet({ sheetNames, rows, date1904 })` and `REQUIRED_COLUMNS`, `EXPECTED_SHEET` in `packages/import/src/columns.ts` and `packages/import/src/parse-sheet.ts` (header lookup by cleaned name; build each `ImportRow` reading **only** the required columns; skipped rows and duplicates by `identityKey`, first kept) until T014 and T015 pass
- [X] T019 [P] [US1] Implement `apps/web/src/app/importa/workbook-reader.ts`: `readWorkbook(file: File): Promise<{ sheetNames; rows; date1904 }>` with `await import('xlsx')` (lazy chunk), `XLSX.read(await file.arrayBuffer(), { type: 'array', dense: true })`, rows of sheet `ElencoAdesioniExcel` via `sheet_to_json(ws, { header: 1, raw: true, defval: null })` (empty `rows` if the sheet is missing); throw `UnreadableFileError` on parse failure; no logging of contents
- [X] T020 [US1] Implement `apps/web/src/app/importa/import.service.ts` (signals): states `idle | reading | rejected | preview | saving | done | saveFailed` (data-model.md); `chooseFile(file)` → reader → `parseAdhesionSheet` → `preview`; `cancel()`; computed `firstRows` (10), `skippedMessages`; inject reader via token so specs can fake it — until T016 passes
- [X] T021 [US1] Implement `apps/web/src/app/importa/pages/import/import-page.ts` (standalone, Angular Material, Italian texts from `contracts/app-routes.md`, date shown GG/MM/AAAA, layout without horizontal scroll at 360 px) until T017 passes
- [X] T022 [US1] Add route `importa` (guard `allowed`, as `/listini`) in `apps/web/src/app/app.routes.ts`; provide `IMPORT_BACKEND` in `apps/web/src/app/app.config.ts` with a stub class in `apps/web/src/app/importa/firestore-import-backend.ts` whose methods throw `new Error('non implementato')` (replaced in T029, never reached in US1 because the preview needs no backend until T038); add "Importa Excel" link in `apps/web/src/app/pages/home/home.ts` and its spec `apps/web/src/app/pages/home/home.spec.ts`

**Checkpoint**: US1 provabile in locale con il file finto (solo anteprima, nessun salvataggio)

---

## Phase 4: User Story 2 - Confermare e salvare tesserati e adesioni (Priority: P1)

**Goal**: alla conferma si salvano in un'unica transazione segno di import, persone nuove e adesioni; riepilogo finale.

**Independent Test**: sugli emulatori, import del file finto → 15 `adhesions/2026_*`, 15 `persons`, `importBatches/2026-ACR`; messaggio "Import completato: 15 adesioni 2026/27, 15 persone nuove, 0 già presenti."; "Tesserati" mostra le 15 righe del 2026/27 a un'altra persona autorizzata.

### Tests for User Story 2 ⚠️ (write first, must fail)

- [ ] T023 [P] [US2] Write `packages/import/tests/plan-import.test.ts` (P13): with empty `existing` all rows are `newPersons`; with one `identityKey` already present that row goes to `reusedPersons` with its `personId` and still counts in `adhesions`; `importId` = `'2026-ACR'`; skipped rows carried over
- [ ] T024 [P] [US2] Extend `firebase/tests/rules.test.ts` with section "Import ACR" (contract firestore-import.md I1–I4, I7–I11), seeding `feeSchedules/2026` and `allowedEmails` with rules disabled: unauthenticated / not listed → denied on get/list/create of `importBatches`, `persons`, `adhesions`; listed user can read; full import (batch + 15 persons + 15 adhesions) in one `writeBatch` → allowed; 89 persons + 89 adhesions + batch → allowed; person or adhesion alone → denied; extra field (`address`, `paid`, `mlac`) or wrong type (`birthDate: 19650312`, `associationYear: '2026'`) → denied; adhesion ID ≠ `{year}_{personId}` or `importId` ≠ `{year}-ACR` → denied; update/delete of each → denied; `importedBy` ≠ own lowercase email or `importedAt` ≠ `request.time` → denied
- [ ] T025 [P] [US2] Write `apps/web/src/app/importa/firestore-import-backend.emulator.test.ts` (pattern of `apps/web/src/app/listini/firestore-fee-schedule-backend.emulator.test.ts`, seed via REST "Bearer owner"): `existingPersons()` returns the map; `commit()` of the plan from the ACR sample file writes 15 adhesions, 15 persons, the batch with counts, `importedBy` lowercase, and **no** excluded field in any document; a second-year import with one existing person reuses it (no new person, 1 new adhesion)
- [ ] T026 [P] [US2] Extend `apps/web/src/app/importa/import.service.spec.ts` and `apps/web/src/app/importa/pages/import/import-page.spec.ts` (save part): "Importa" → `saving` (buttons disabled) → `done` with counts and skipped rows; `commit` failure → `saveFailed` with "Impossibile salvare. Controlla la connessione e riprova. Non è stato salvato nulla." and retry possible; leaving during `saving` asks confirmation

### Implementation for User Story 2

- [ ] T027 [US2] Implement `planImport(parsed, existing)` in `packages/import/src/plan-import.ts` and export it until T023 passes
- [ ] T028 [US2] Add rules in `firebase/firestore.rules` **before** the final deny-all, per contracts/firestore-import.md: `match /importBatches/{batchId}` (get/list `isAllowed()`; create with `d.associationYear is int`, `batchId == string(d.associationYear) + '-ACR'`, `source == 'ACR'`, `keys().hasOnly/hasAll` of `associationYear, source, importedAt, importedBy, adhesionCount, newPersonCount, skippedRowCount`, `adhesionCount` int > 0, other counts int ≥ 0, `importedAt == request.time`, `importedBy == ownEmail()`, `exists(feeSchedules/$(string(d.associationYear)))`; update/delete false); `match /persons/{personId}` (create: required `lastName, firstName, birthDate, identityKey, createdInImport` non-empty strings, `birthDate.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')`, optional `sex in ['M','F']`, optional `taxCode.matches('^[A-Z0-9]{16}$')`, `hasOnly` of these 7 keys, `!exists(importBatches/$(d.createdInImport))` and `existsAfter(...)`; update/delete false); `match /adhesions/{adhesionId}` (create: `d.associationYear is int`, `d.personId is string`, `adhesionId == string(d.associationYear) + '_' + d.personId`, `importId == string(d.associationYear) + '-ACR'`, `sector` non-empty, optional `exportAgeBand, bond, bondId` strings, `hasOnly` of `personId, associationYear, importId, sector, exportAgeBand, bond, bondId`, `!exists`/`existsAfter` of the batch; update/delete false) — until T024 passes (`npm run test:rules`)
- [ ] T029 [US2] Implement `apps/web/src/app/importa/firestore-import-backend.ts`: `existingPersons()` = `getDocs(collection(db, 'persons'))` → map `identityKey → id`; `commit(plan, email)` = `runTransaction`: `get` batch (exists → `AlreadyImportedError`), `get` `feeSchedules/{year}` (missing → `NoFeeScheduleError`), `set` batch with `serverTimestamp()` and lowercase email, `set` each new person on `doc(collection(db, 'persons'))` with `createdInImport`, `set` each adhesion on `adhesions/{year}_{personId}`; omit `undefined` fields; map Firestore errors to these classes without logging data — until T025 passes; wire it in `apps/web/src/app/app.config.ts`
- [ ] T030 [US2] Extend `import.service.ts` (`confirm()`: `existingPersons` → `planImport` → `commit` with the user's email from `AuthService` → `done`/`saveFailed`) and `import-page.ts` (summary, "Torna alla home"); add `canDeactivate` on `/importa` that asks confirmation only in `saving` (reuse pattern of `apps/web/src/app/listini/unsaved-changes.guard.ts`) — until T026 passes
- [ ] T031 [US2] Make `apps/web/src/app/listini/schedule-usage.ts` real (research R10): `isInUse(year)` = existence of `importBatches/{year}-ACR`; remove the 003 test indicator from the listini detail page and update `apps/web/src/app/listini/**/*.spec.ts` accordingly
- [ ] T032 [US2] Add the new emulator tests to the `test:integration` script in `apps/web/package.json` (chained `ng test --include **/firestore-import-backend.emulator.test.ts` and `--include **/firestore-members-backend.emulator.test.ts`, run in series)

#### Sezione "Tesserati" in sola lettura (FR-019, SC-003) — ID aggiunti dopo `/speckit-analyze` (C1)

- [ ] T046 [P] [US2] Write `apps/web/src/app/tesserati/pages/members/members-page.spec.ts` with a fake `MembersBackend` (contract app-routes.md "Pagina Tesserati"): year selector lists imported years newest first as "2026/27"; default = newest, or `?anno=2026`; table Cognome e nome / Data di nascita (GG/MM/AAAA) / Settore / Fascia d'età (export) / Legame (`C3 · 900002`, empty if absent), sorted by last name then first name; total "15 tesserati nel 2026/27"; empty state "Nessun tesserato importato. Usa Importa Excel." with link to `/importa`; no edit/delete buttons
- [ ] T047 [P] [US2] Write `apps/web/src/app/tesserati/firestore-members-backend.emulator.test.ts` (seed via REST "Bearer owner"): `importedYears()` returns `[2026]` after seeding `importBatches/2026-ACR`, `[]` when empty; `membersOfYear(2026)` joins `adhesions` (where `associationYear == 2026`) with `persons` on `personId` and returns only the fields of the table; an adhesion of 2027 is not returned for 2026
- [ ] T048 [US2] Create `apps/web/src/app/tesserati/members-backend.ts` (interface `MembersBackend` with `importedYears(): Promise<number[]>` and `membersOfYear(year): Promise<MemberRow[]>`, `MemberRow` = `lastName, firstName, birthDate, sector, exportAgeBand?, bond?, bondId?`; token `MEMBERS_BACKEND`) and `apps/web/src/app/tesserati/firestore-members-backend.ts` (`getDocs(collection(db, 'importBatches'))`, `getDocs(query(collection(db, 'adhesions'), where('associationYear', '==', year)))` + `getDocs(collection(db, 'persons'))`, join in memory; no logging) until T047 passes; provide it in `apps/web/src/app/app.config.ts`
- [ ] T049 [US2] Implement `apps/web/src/app/tesserati/pages/members/members-page.ts` (standalone, Angular Material, signals, query param `anno`, layout without horizontal scroll at 360 px) until T046 passes; add route `tesserati` (guard `allowed`) in `apps/web/src/app/app.routes.ts`, link "Tesserati" in `apps/web/src/app/pages/home/home.ts` (+ `home.spec.ts`), and button "Vedi i tesserati" (`/tesserati?anno={year}`) in the `done` state of `apps/web/src/app/importa/pages/import/import-page.ts` (+ its spec)

**Checkpoint**: `npm run test:rules` and `npm run test:integration -w web` green; US1 + US2 = import completo del file finto

---

## Phase 5: User Story 3 - Rifiutare file non validi e riimporti (Priority: P2)

**Goal**: file sbagliati, anni senza listino e anni già importati sono rifiutati con un messaggio chiaro e nulla viene salvato.

**Independent Test**: file Giovani, file con `Data Nascita` rinominata, file "Anno 2030", file ACR già importato → messaggi del contratto, nessun documento nuovo.

### Tests for User Story 3 ⚠️ (write first, must fail)

- [ ] T033 [P] [US3] Extend `packages/import/tests/parse-sheet.test.ts` and `packages/import/tests/sample-files.test.ts` (P2, P4–P7, P10): Giovani and Adulti sample files → `notAcr`; missing/renamed `Data Nascita` → `missingColumns` `['Data Nascita']` (several missing → all listed in header order of `REQUIRED_COLUMNS`); other sheet name → `sheetNotFound`; header only → `noRows`; `Anno 2026` + `Anno 2027` → `mixedYears`; `2026` / empty year → `invalidYear`; all rows invalid → `allRowsSkipped` with the skipped list
- [ ] T034 [P] [US3] Extend `firebase/tests/rules.test.ts` (I5, I6): second import of 2026 (batch already exists) → denied and nothing changes; import of 2030 without `feeSchedules/2030` → denied
- [ ] T035 [P] [US3] Extend `apps/web/src/app/importa/firestore-import-backend.emulator.test.ts`: `yearStatus(2026)` before/after import; `commit` on an imported year → `AlreadyImportedError`, on a year without fee schedule → `NoFeeScheduleError`, and document counts unchanged
- [ ] T036 [P] [US3] Extend `apps/web/src/app/importa/import.service.spec.ts` and `apps/web/src/app/importa/pages/import/import-page.spec.ts`: each `ParsedImport` error, `UnreadableFileError`, `yearStatus` → `hasFeeSchedule: false` (message with link to `/listini`) and `alreadyImported: true` → state `rejected` with the exact message of `contracts/app-routes.md`, button "Scegli un altro file", no `commit`; `AlreadyImportedError`/`NoFeeScheduleError` raised at commit time → same messages

### Implementation for User Story 3

- [ ] T037 [US3] Complete file-level errors in `packages/import/src/parse-sheet.ts` (sheet, columns, no rows, year, mixed years, `notAcr` when no row has `sector === 'RAGAZZI'`, all skipped) until T033 passes
- [ ] T038 [US3] In `import.service.ts` call `backend.yearStatus(year)` after parsing and before showing the preview; map every error to the `rejected` state with the messages of `contracts/app-routes.md` (constants in `apps/web/src/app/importa/messages.ts`); `import-page.ts` shows the message, link "Listini" for the missing fee schedule, and "Scegli un altro file" — until T036 passes
- [ ] T039 [US3] Implement `yearStatus` in `apps/web/src/app/importa/firestore-import-backend.ts` (`getDoc` of `feeSchedules/{year}` and `importBatches/{year}-ACR`) until T035 passes; re-run `npm run test:rules` for T034

**Checkpoint**: tutte le storie funzionano insieme; tutti i test verdi

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T040 [P] Write `packages/import/README.md` (Italian: purpose, public API, research decisions R3–R6, how to run tests)
- [ ] T041 [P] Privacy check (SC-006): search `apps/web/src/app/importa` and `packages/import/src` for `console.` and for logging of rows; confirm no network request carries the file (only Firestore writes of the allowed fields); document the result in the PR
- [ ] T042 Run full suite from repo root: `npm run typecheck`, `npm test`, `npm run test:rules`, `npm run test:integration -w web`, `npm run build -w web` (check SheetJS is in a lazy chunk, not in the initial bundle)
- [ ] T043 [P] Update `docs/roadmap.md` (004 ✅ when released) and `CLAUDE.md` "Stato attuale" (004 done, commands for `@tesseramento/import`, next 005)
- [ ] T044 Manual scenarios M1–M9 of `specs/004-import-excel-acr/quickstart.md` in the browser on the emulators (360 px included; measure the preview time for SC-001 ≤ 5 s); mark results in the PR
- [ ] T045 Release only after all tests are green: `npx firebase deploy --only firestore:rules,hosting --project tesseramento-ac`; the first real import is done by the secretary from the app (the real file never enters the repository)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: nessuna dipendenza
- **Foundational (Phase 2)**: dopo il Setup; blocca tutte le storie
- **US1 (Phase 3)**: dopo la Foundational
- **US2 (Phase 4)**: dopo la Foundational; per la prova end-to-end serve l'anteprima di US1 (T020–T021)
- **US3 (Phase 5)**: dopo US1 (stati della schermata) e T029 (backend Firestore)
- **Polish (Phase 6)**: dopo le storie scelte

### Within Each Story

- Test prima, devono fallire; poi tipi → funzioni pure → backend → servizio → pagina
- Le regole (T028) prima del backend Firestore (T029)
- Stesso file = in sequenza (es. `import.service.ts` T020 → T030 → T038; `parse-sheet.ts` T018 → T037; `import-page.ts` T021 → T030 → T049 → T038)
- T046–T049 (Tesserati) si eseguono dopo T030 e prima di T031–T032; gli ID non sono in ordine perché aggiunti dopo l'analisi

### Parallel Opportunities

- Setup: T003 in parallelo dopo T001–T002
- Foundational: T004–T006 insieme; T008–T010 insieme; T012–T013 insieme
- US1: T014–T017 insieme; T019 in parallelo a T018
- US2: T023–T026 insieme; T046–T047 insieme (dopo T029 per avere dati reali nell'emulatore, ma indipendenti nei file)
- US3: T033–T036 insieme
- Polish: T040, T041, T043 insieme

---

## Parallel Example: User Story 1

```bash
# Test di US1 insieme (file diversi):
Task: "T014 parse-sheet.test.ts (righe sintetiche)"
Task: "T015 sample-files.test.ts (file ACR finto)"
Task: "T016 import.service.spec.ts (anteprima)"
Task: "T017 import-page.spec.ts (anteprima)"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 + Phase 2
2. Phase 3 (US1): anteprima del file, nessun salvataggio
3. **STOP and VALIDATE**: file finto → 2026/27, 15 righe; "Annulla" non salva nulla

### Incremental Delivery

1. US1 → anteprima dimostrabile
2. US2 → import completo (regole testate sull'emulatore) → rilasciabile
3. US3 → messaggi per file sbagliati e riimporti (le regole già bloccano il riimporto da US2)
4. Polish → documentazione, controllo privacy, rilascio

---

## Notes

- [P] = file diversi, nessuna dipendenza da task incompleti
- Mai dati reali: il file vero si usa solo in produzione, dall'app, dalla segreteria
- Committare dopo ogni task o gruppo logico; fermarsi ai checkpoint per validare
