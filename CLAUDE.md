# Tesseramento AC – Parrocchia San Gioacchino

App Angular + Firebase per il tesseramento annuale all'Azione Cattolica: import degli Excel
(ACR, Giovani, Adulti), riconferma delle adesioni, calcolo delle quote per nucleo familiare.

## Metodo: Spec-Driven Development con Spec Kit

- Constitution (regole non negoziabili): `.specify/memory/constitution.md` — leggerla prima di tutto.
- Dominio (fonte di verità): `docs/dominio/` — in particolare `regole-quote.md` (unica fonte: il PDF
  in `docs/dominio/fonti/`), `regole-famiglia.md`, `glossario.md`, `excel-esempio/`.
- Roadmap delle specifiche: `docs/roadmap.md`; brief in `docs/brief/`.
- Ciclo per ogni specifica: `/speckit-specify` → `/speckit-clarify` → revisione umana →
  `/speckit-plan` → `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement`.

## Stato attuale

- Fatte: **001 – Accesso riservato** (app Angular in `apps/web`, regole Firestore in `firebase/`) e
  **002 – Calcolo quota famiglia** (`packages/fees`). App online su https://tesseramento-ac.web.app
  (progetto Firebase `tesseramento-ac`).
- **003 – Listino per anno**: rilasciata il 2026-11-17 (regole, hosting e seed del 2026/27 in produzione; seed già eseguito, non rilanciare).
  Schermate `/listini`, listini in Firestore `feeSchedules`.
- Test delle regole (`npm run test:rules`) e di integrazione (`npm run test:integration -w web`) ora girano: JDK 21 installato
  (se `java` non è nel PATH, impostare `JAVA_HOME`).
- **004 – Import Excel ACR**: rilasciata il 2026-11-17 (regole e hosting in produzione; nessun dato importato: il primo import reale lo fa la segreteria dall'app).
  Pacchetto puro `packages/import` (lettura righe, pulizia, identità), schermate `/importa` e `/tesserati`,
  collezioni Firestore `importBatches` (`{anno}-ACR`), `persons`, `adhesions` (`{anno}_{personId}`).
  SheetJS 0.20.3 installato dal CDN ufficiale (non da npm). Il file finto ACR ha 15 righe (l'export reale 89).
- **005 – Import Giovani e Adulti**: rilasciata il 2026-11-17 (regole e hosting in produzione; nessun dato importato).
  Stessa schermata `/importa` per i tre elenchi (riconosciuti dal settore più frequente; in parità sceglie
  l'utente); segno di import `{anno}-{ACR|GIOVANI|ADULTI}`; una sola adesione per persona per anno (righe già
  importate da un altro elenco saltate). File finti: ACR 15, Giovani 8, Adulti 14 → 37 tesserati nel 2026.
- **006 – Errori e duplicati nell'import**: rilasciata il 2026-11-17
  (solo hosting: regole invariate). Anteprima con possibili doppioni da decidere ("Stessa persona" /
  "Persona diversa", regole in `regole-famiglia.md` §2), persone riconosciute dal codice fiscale, righe saltate con
  nome (solo a schermo), avvisi età/settore dal listino. `@tesseramento/import` ora dipende da `@tesseramento/fees`.
- **007 – Famiglie**: rilasciata il 2026-11-17 (regole + hosting). Pagina
  `/famiglie`: famiglie suggerite dal `N. Legame`, conferma (anche "Conferma tutte" a gruppi di 8 per il limite di
  letture delle regole), correzioni, famiglie a mano, scioglimento. Pacchetto puro `packages/families`. Firestore:
  `families/{id}` + `familyMemberships/{anno}_{personId}` (l'appartenenza è la fonte di verità: una famiglia per persona
  per anno).
- **010 – Quote nella famiglia**: rilasciata il 2026-11-17 (regole + hosting; nessuna quota salvata). Pagina `/quote`:
  nuclei dell'anno (famiglie confermate + singoli) con quota da `calculateHouseholdFee`, quote manuali con nota per i
  casi non previsti, salvataggio e "Aggiorna tutte" / "Aggiorna questa quota". Logica pura in `packages/families`
  (`householdsOfYear`, `householdFees`, `compareWithSaved`); Firestore `householdFees/{anno}_{f-familyId|p-personId}`.
- **Anno dell'export** (corretto il 2026-11-17): `Anno N` = anno associativo (N−1)/N; l'export reale "Anno 2026" è il
  2025/26. L'import non richiede più il listino (un anno passato si importa senza avvisi d'età). I file finti
  riportano "Anno 2027" (= 2026/27). In produzione i dati importati con la regola vecchia sono stati **cancellati il
  2026-11-17** (importBatches, persons, adhesions, families, familyMemberships, householdFees; listini ed email intatti):
  la segreteria deve reimportare i tre Excel (→ 2025/26) e riconfermare verso il 2026/27.
- **008 – Riconferma adesione**: rilasciata il 2026-11-17 (regole + hosting). Pagina `/riconferme`:
  tesserati dell'anno precedente raggruppati per `N. Legame`, elenco del nuovo anno ricalcolato dalle fasce del listino,
  riconferma a gruppi di 15 (limite letture delle regole), "Annulla riconferma". Una riconferma è un'adesione con
  `origin: 'riconferma'` e `list` (niente `importId`); elenco letto con `listOfAdhesion`; anni con tesserati da
  `core/member-years.ts` (import + riconferme); l'import salta le persone riconfermate (`alreadyRenewed`).
- **009 – Nuovo tesserato**: rilasciata il 2026-11-17 (regole + hosting). Modulo "Nuovo
  tesserato" (`apps/web/src/app/nuovo-tesserato`) da Tesserati e Riconferme; ricerca in archivio con le regole di §2
  (`validateNewMember`, `matchNewMember` in `packages/import`); persona manuale (`createdInYear/At/By`, solo insieme alla
  sua adesione) e adesione `origin: 'nuovo'`; sezione "Nuovi tesserati" in Riconferme con "Annulla iscrizione";
  l'import salta gli inseriti a mano (`alreadyAdded`); Quote non invita a creare un listino prima del primo.
- Poi: **011 – Cambio categoria per età** (roadmap in `docs/roadmap.md`).

## Comandi

- App in locale: `npm run emulators` (emulatori Auth/Firestore) e `npm start` (usa il progetto `demo-tesseramento`).
- Test: `npm test` (tutti i workspace; in `firebase` solo il test di seed, senza emulatore); app: `npm test -w web`; calcolo quote: `npm test -w @tesseramento/fees`; import: `npm test -w @tesseramento/import`; famiglie: `npm test -w @tesseramento/families`.
- Controllo tipi: `npm run typecheck`. Test regole: `npm run test:rules` (richiede JDK).
- Rilascio: `npx firebase deploy --only firestore:rules,hosting --project tesseramento-ac` solo dopo test verdi.
- Elenco email autorizzate: collezione Firestore `allowedEmails`, ID documento = email in minuscolo.

## Regole pratiche

- Mai dati reali dei tesserati nel repository, nei test o nei log: solo i dati finti di
  `docs/dominio/excel-esempio/`.
- Le regole delle quote seguono solo il PDF: se qualcosa non è previsto, si segnala, non si inventa.
- Codice e identificatori in inglese; interfaccia, documentazione e specifiche in italiano.
- TypeScript 6.0 (richiesto da Angular 22), Node.js 22, Vitest.
